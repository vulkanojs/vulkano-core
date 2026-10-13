module.exports = {

  // Fields
  attributes: {
    name: { type: String, required: true },
    role: { type: String, default: 'user' },
    // Hidden path — never in any scaffold response (create included)
    secret: { type: String, select: false }
  },

  // Update allowlist — leaves `active` out on purpose: the scaffold's soft
  // delete must still work (test/integration/scaffold-fillable.test.js)
  fillable: ['name']

};
