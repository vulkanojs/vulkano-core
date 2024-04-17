const Cron = require('cron').CronJob;

module.exports = {

  schedule(props) {

    const {
      time,
      start,
      task,
      onComplete,
      timeZone
    } = props || {};

    const config = {
      cronTime: time,
      onTick: task || ( () => {} ),
      onComplete: onComplete || ( () => {} ),
      timeZone: timeZone || 'America/New_York',
      start: typeof start !== 'undefined' ? start : true
    };

    return Cron.from(config);

  }

};
