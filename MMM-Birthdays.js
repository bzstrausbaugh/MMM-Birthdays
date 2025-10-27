function updateBirthdays(payload) {
  const today = dayjs().startOf('day');
  const header = document.getElementById('birthday-header');
  header.innerHTML = `Birthdays for ${today.format('MMMM')}`;
  const entries = document.getElementById('birthday-entries');
  entries.innerHTML = '';
  if (payload.birthdays.length === 0) {
    const entryNode = document.createElement('div');
    entryNode.id = `entry-0`;
    entryNode.classList.add('entry');
    entryNode.classList.add('none');
    entryNode.innerHTML = 'No birthdays this month';
  } else {
    payload.birthdays
      .sort((a, b) => a.birthday - b.birthday)
      .forEach((birthdayEntry, idx) => {
        const birthday = dayjs(birthdayEntry.birthday);
        if (today.get('month') === birthday.get('month')) {
          const entryNode = document.createElement('div');
          entryNode.id = `entry-${idx}`;
          entryNode.classList.add('entry');
          if (today.diff(birthday, 'day') === 0) {
            entryNode.classList.add('today');
          } else if (today.diff(birthday, 'day') > 0) {
            entryNode.classList.add('future');
          } else {
            entryNode.classList.add('past');
          }
          entryNode.innerHTML = `${birthday.format('MM-DD')} - ${
            birthdayEntry.name
          } ${birthdayEntry.age > 0 ? '(' + birthdayEntry.age + ')' : ''}`;
          entries.appendChild(entryNode);
        }
      });
  }
}

Module.register('MMM-Birthdays', {
  start: function () {
    Log.log('Starting module: ' + this.name);
    // Trigger the first request
    this.getBirthdays(this);
  },

  getBirthdays: function (_this) {
    // Make the initial request to the helper then set up the timer to perform the updates
    _this.sendSocketNotification('GET_BIRTHDAYS', {
      documentId: _this.config.documentId,
      sheetName: _this.config.sheetName,
    });

    setTimeout(_this.getBirthdays, 5 * 60 * 1000, _this); //Refresh every hour
  },

  getScripts: function () {
    return ['dayjs.js'];
  },

  getStyles: function () {
    return ['MMM-Birthdays.css'];
  },

  getDom: function () {
    const wrapper = document.createElement('div');
    wrapper.id = 'birthday-wrapper';
    wrapper.classList.add('MMM-Birthday');
    wrapper.innerHTML = `<div id="birthday-header" class="header">Birthdays for</div><div id="birthday-entries" class="entry"></div>`;
    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'GOT_BIRTHDAYS') {
      if (payload) {
        updateBirthdays(payload);
      }
    }
  },
});
