module.exports = {
  scaffold: true,
  model: 'School',
  allowedMethods: ['get', 'post'],
  // Opt-in to ScaffoldController's generic subdoc routes for the `grades`
  // field: POST/GET/PUT/DELETE /api/school/:id/:key/:subId? — proves the
  // fully generic (not hand-wired) path works end-to-end. `notices` is
  // restricted to GET/POST only, proving the per-key method allowlist
  // (`{ key: [...] }`) 405s PUT/DELETE before reaching the model.
  subdocs: ['grades', { notices: ['GET', 'POST'] }]
};
