module.exports = {
  scaffold: true,
  model: 'School',
  allowedMethods: ['get', 'post'],
  // Opt-in to ScaffoldController's generic subdoc routes for the `grades`
  // field: POST/GET/PUT/DELETE /api/school/:id/:key/:subId? — proves the
  // fully generic (not hand-wired) path works end-to-end.
  subdocs: ['grades']
};
