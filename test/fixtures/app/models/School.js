module.exports = {

  // Fields
  attributes: {
    name: { type: String, required: true },
    address: { type: String },
    // Subdocument array — exercises ScaffoldController's generic, opt-in
    // subdoc routes (`subdocs: ['grades']` on SchoolController), as opposed
    // to Item/Example's hand-written subdoc routes.
    grades: [{
      label: { type: String, trim: true },
      level: { type: Number, default: 1 }
    }],
    // Subdocument array with a per-key method restriction on SchoolController
    // (`subdocs: [..., { notices: ['GET'] }]`) — exercises ScaffoldController's
    // 405 path when a method outside the allowlist hits a restricted key.
    notices: [{
      text: { type: String, trim: true }
    }]
  }

};
