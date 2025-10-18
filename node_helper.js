var NodeHelper = require('node_helper');
var undici = require('undici');
var dayjs = require('dayjs');

function normalizeRow(rows) {
  return rows.map((row) =>
    row && row.v !== null && row.v !== undefined ? row : {}
  );
}

function applyHeaderIntoRows(header, rows) {
  return rows
    .map(({ c: row }) => normalizeRow(row))
    .map((row) =>
      row.reduce(
        (p, c, i) =>
          c.v !== null && c.v !== undefined
            ? Object.assign(p, {
                [header[i]]: c.v,
              })
            : p,
        {}
      )
    );
}

function getItems(sheetContent) {
  let rows = [];

  try {
    const payloadExtractRegex =
      /google\.visualization\.Query\.setResponse\(({.*})\);/;
    const [_, payload] = sheetContent.match(payloadExtractRegex);
    const parsedJSON = JSON.parse(payload);
    const hasSomeLabelPropertyInCols = parsedJSON.table.cols.some(
      ({ label }) => !!label
    );
    if (hasSomeLabelPropertyInCols) {
      const header = parsedJSON.table.cols.map(({ label }) => label);

      rows = applyHeaderIntoRows(header, parsedJSON.table.rows);
    } else {
      const [headerRow, ...originalRows] = parsedJSON.table.rows;
      const header = normalizeRow(headerRow.c).map((row) => row.v);

      rows = applyHeaderIntoRows(header, originalRows);
    }
  } catch (e) {
    console.error('Error parsing spreadsheet data:', e);
  }

  const currentYear = dayjs().get('year');
  return rows.map((row) => {
    const birthdateSplit = row.Birthday.split('.');
    const birthday = dayjs()
      .set('month', parseInt(birthdateSplit[0]) - 1)
      .set('date', parseInt(birthdateSplit[1]))
      .startOf('day');
    const age =
      birthdateSplit.length < 3
        ? -1
        : currentYear - parseInt(birthdateSplit[2]);
    return {
      name: row.Name,
      birthday: birthday.valueOf(),
      age: age,
    };
  });
}

module.exports = NodeHelper.create({
  start: function () {
    console.log('MMM-Birthdays helper, started...');
  },

  getBirthdays: function (payload) {
    var _this = this;
    undici
      .request(
        `https://docs.google.com/spreadsheets/d/${payload.documentId}/gviz/tq?sheet=${payload.sheetName}`,
        {
          method: 'GET',
        }
      )
      .then((sheetResponse) => {
        if (sheetResponse > 299) {
          throw Error('error retrieving sheet');
        }
        return sheetResponse.body;
      })
      .then((sheetBody) => sheetBody.text())
      .then((sheetContent) => {
        const rows = getItems(sheetContent);
        _this.sendSocketNotification('GOT_BIRTHDAYS', {
          birthdays: rows,
        });
      })
      .catch((error) => console.error('Error', error));
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'GET_BIRTHDAYS') {
      this.getBirthdays(payload);
    }
  },
});
