/**
 * Crontab — unit tests
 */

const Crontab = require('../../../libs/Crontab');

describe('Crontab.schedule', () => {

  it('defaults timeZone to UTC when none is given', () => {
    const job = Crontab.schedule({ time: '0 0 * * *', task: () => {} });
    expect(job.cronTime.timeZone).toBe('UTC');
    job.stop();
  });

  it('honors a custom timeZone override', () => {
    const job = Crontab.schedule({ time: '0 0 * * *', timeZone: 'America/New_York', task: () => {} });
    expect(job.cronTime.timeZone).toBe('America/New_York');
    job.stop();
  });

  it('defaults start to true', () => {
    const job = Crontab.schedule({ time: '0 0 * * *', task: () => {} });
    expect(job.isActive).toBe(true);
    job.stop();
  });

  it('honors start: false', () => {
    const job = Crontab.schedule({ time: '0 0 * * *', task: () => {}, start: false });
    expect(job.isActive).toBe(false);
  });

  it('runs onTick via a manual fireOnTick call', () => {
    const task = jest.fn();
    const job = Crontab.schedule({ time: '0 0 * * *', task, start: false });
    job.fireOnTick();
    expect(task).toHaveBeenCalledTimes(1);
  });

});
