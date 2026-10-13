/**
 * database/scaffold.js — populate helpers unit tests
 * Pure functions only: no server, no DB required.
 */

const scaffold = require('../../../database/scaffold');

// Fake ref model: every path visible, so _sanitizeFields keeps any field
const fakeRef = Object.assign(Object.create(scaffold), {
  schema: { path: () => ({ options: {} }) }
});

// Fake model: only what _buildPopulate reads (this.schema.paths, and the
// ref models on this.db.models for request field selection)
function fakeModel(paths) {
  return Object.assign(Object.create(scaffold), {
    schema: { paths },
    db: { models: { School: fakeRef, Tag: fakeRef } }
  });
}

// ─────────────────────────────────────────────
// _getSanitizedPopulate
// ─────────────────────────────────────────────
describe('scaffold._getSanitizedPopulate', () => {

  it('returns [] when props.populate is missing', () => {
    expect(scaffold._getSanitizedPopulate({})).toEqual([]);
    expect(scaffold._getSanitizedPopulate(undefined)).toEqual([]);
  });

  it('trims and lowercases each entry', () => {
    expect(scaffold._getSanitizedPopulate({ populate: '  School , Author ' }))
      .toEqual(['school', 'author']);
  });

  it('drops empty entries from trailing/double commas', () => {
    expect(scaffold._getSanitizedPopulate({ populate: 'school,,author,' }))
      .toEqual(['school', 'author']);
  });

});

// ─────────────────────────────────────────────
// _buildPopulate
// ─────────────────────────────────────────────
describe('scaffold._buildPopulate', () => {

  // "school" opted in via autopopulate: true, "secret" is a real ref but
  // did NOT opt in — this is the security gate: a relation only becomes
  // reachable through ?populate= when its own attribute says so
  const paths = {
    name: { options: {} },
    school: { options: { ref: 'School', autopopulate: true } },
    secret: { options: { ref: 'InternalStuff' } }
  };

  it('returns [] when nothing was requested', () => {
    expect(fakeModel(paths)._buildPopulate({})).toEqual([]);
  });

  it('returns [] for a requested field with no ref in the schema', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'name' })).toEqual([]);
  });

  it('populates a ref field marked autopopulate: true when requested', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'school' }))
      .toEqual([{ path: 'school' }]);
  });

  it('refuses a real ref field that is NOT marked autopopulate (the security gate)', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'secret' })).toEqual([]);
  });

  it('requesting both returns only the one marked autopopulate', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'school,secret' }))
      .toEqual([{ path: 'school' }]);
  });

  it('supports array-of-ref fields via the caster options', () => {
    const arrayPaths = {
      ...paths,
      tags: { options: {}, caster: { options: { ref: 'Tag', autopopulate: true } } }
    };
    expect(fakeModel(arrayPaths)._buildPopulate({ populate: 'tags' }))
      .toEqual([{ path: 'tags' }]);
  });

  it('an array-of-ref field WITHOUT autopopulate on the caster is refused', () => {
    const arrayPaths = {
      ...paths,
      tags: { options: {}, caster: { options: { ref: 'Tag' } } }
    };
    expect(fakeModel(arrayPaths)._buildPopulate({ populate: 'tags' })).toEqual([]);
  });

  it('a real ref field without autopopulate CAN be allowed per-call via the extra param', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'secret' }, ['secret']))
      .toEqual([{ path: 'secret' }]);
  });

  it('the extra param does not open a field with no ref at all', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'name' }, ['name'])).toEqual([]);
  });

  it('extra is case-insensitive, same as autopopulate', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'secret' }, ['Secret']))
      .toEqual([{ path: 'secret' }]);
  });

  it('a colon after the relation name narrows the populated fields', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'school:name' }))
      .toEqual([{ path: 'school', select: 'name' }]);
  });

  it('field select supports a pipe-separated list, trimmed', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'school: name | active ' }))
      .toEqual([{ path: 'school', select: 'name active' }]);
  });

  it('without a colon, no select is added (full doc)', () => {
    expect(fakeModel(paths)._buildPopulate({ populate: 'school' }))
      .toEqual([{ path: 'school' }]);
  });

  it('field select on one relation does not leak into another in the same request', () => {
    const arrayPaths = {
      ...paths,
      tags: { options: { ref: 'Tag', autopopulate: true } }
    };
    expect(fakeModel(arrayPaths)._buildPopulate({ populate: 'school:name,tags' }))
      .toEqual([{ path: 'school', select: 'name' }, { path: 'tags' }]);
  });

});

// ─────────────────────────────────────────────
// _parsePopulateEntries
// ─────────────────────────────────────────────
describe('scaffold._parsePopulateEntries', () => {

  it('returns [] when props.populate is missing', () => {
    expect(scaffold._parsePopulateEntries({})).toEqual([]);
  });

  it('a relation without a colon has fields: null', () => {
    expect(scaffold._parsePopulateEntries({ populate: 'school' }))
      .toEqual([{ name: 'school', fields: null }]);
  });

  it('a relation with a colon parses its pipe-separated fields', () => {
    expect(scaffold._parsePopulateEntries({ populate: 'school:name|address' }))
      .toEqual([{ name: 'school', fields: ['name', 'address'] }]);
  });

  it('mixes plain and field-scoped relations', () => {
    expect(scaffold._parsePopulateEntries({ populate: 'school:name,teacher' }))
      .toEqual([
        { name: 'school', fields: ['name'] },
        { name: 'teacher', fields: null }
      ]);
  });

});

// ─────────────────────────────────────────────
// _sanitizeFields — request field selection never reaches a `select: false` path
// ─────────────────────────────────────────────
describe('scaffold._sanitizeFields', () => {

  const hidden = { options: { select: false } };
  const visible = { options: {} };
  const byPath = { name: visible, password: hidden, secret: hidden };
  const model = Object.assign(Object.create(scaffold), {
    schema: { path: (p) => byPath[p] }
  });

  it('keeps visible fields and exclusions', () => {
    expect(model._sanitizeFields(['name', '-name'])).toEqual(['name', '-name']);
  });

  it('drops a select: false path named explicitly', () => {
    expect(model._sanitizeFields(['name', 'password'])).toEqual(['name']);
  });

  it('drops any +field override', () => {
    expect(model._sanitizeFields(['+password', '+name'])).toEqual([]);
  });

  it('drops a sub-path of a select: false path', () => {
    expect(model._sanitizeFields(['secret.part'])).toEqual([]);
  });

  it('trims and drops empty entries', () => {
    expect(model._sanitizeFields([' name ', '', ' password'])).toEqual(['name']);
  });

  it('returns [] for missing fields', () => {
    expect(model._sanitizeFields(undefined)).toEqual([]);
  });

});
