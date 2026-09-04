/* global FakeModel */

module.exports = {

  // relies on global.FakeModel being set by the test before loadControllersApplication() runs
  scaffold: 'FakeModel',

  // user-defined method on the same key as a scaffold one — must NOT be overridden
  get(req, res) { res.vsr(Promise.resolve({ overridden: true })); }

};
