// Project override of core/libs/Paginate.js — project files must win.
module.exports = {
  get() { return 'overridden'; }
};
