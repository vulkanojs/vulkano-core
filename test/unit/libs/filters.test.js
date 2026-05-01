/**
 * Filter functions — unit tests
 * Each filter module is a plain object with an exec() method.
 */

const ltrim      = require('../../../libs/filters/ltrim');
const rtrim      = require('../../../libs/filters/rtrim');
const number     = require('../../../libs/filters/number');
const objectId   = require('../../../libs/filters/objectId');
const prefix     = require('../../../libs/filters/prefix');
const suffix     = require('../../../libs/filters/suffix');
const saveinteger = require('../../../libs/filters/saveinteger');

// ─────────────────────────────────────────────
// ltrim
// ─────────────────────────────────────────────
describe('ltrim filter', () => {

  it('removes leading spaces when no opt is given', () => {
    expect(ltrim.exec('  hello')).toBe('hello');
  });

  it('removes a specific leading character', () => {
    expect(ltrim.exec('/path/to', '/')).toBe('path/to');
  });

  it('removes multiple consecutive leading characters', () => {
    expect(ltrim.exec('///path', '/')).toBe('path');
  });

  it('does nothing when the string does not start with opt', () => {
    expect(ltrim.exec('path/', '/')).toBe('path/');
  });

  it('returns empty string for falsy input', () => {
    expect(ltrim.exec('')).toBe('');
  });

});

// ─────────────────────────────────────────────
// rtrim
// ─────────────────────────────────────────────
describe('rtrim filter', () => {

  it('removes trailing spaces when no opt is given', () => {
    expect(rtrim.exec('hello   ')).toBe('hello');
  });

  it('removes a specific trailing character', () => {
    expect(rtrim.exec('path/to/', '/')).toBe('path/to');
  });

  it('removes multiple consecutive trailing characters', () => {
    expect(rtrim.exec('path///', '/')).toBe('path');
  });

  it('does nothing when the string does not end with opt', () => {
    expect(rtrim.exec('/path', '/')).toBe('/path');
  });

});

// ─────────────────────────────────────────────
// number
// ─────────────────────────────────────────────
describe('number filter', () => {

  it('extracts only digits from a mixed string', () => {
    expect(number.exec('cu570m 5tr1ng')).toBe('57051');
  });

  it('returns all digits when input is already numeric', () => {
    expect(number.exec('12345')).toBe('12345');
  });

  it('returns empty string when there are no digits', () => {
    expect(number.exec('abc')).toBe('');
  });

  it('handles falsy input gracefully', () => {
    expect(number.exec(null)).toBe('');
    expect(number.exec(undefined)).toBe('');
  });

});

// ─────────────────────────────────────────────
// objectId
// ─────────────────────────────────────────────
describe('objectId filter', () => {

  it('extracts the id from an ObjectId wrapper string', () => {
    expect(objectId.exec('ObjectId("507f1f77bcf86cd799439011")')).toBe('507f1f77bcf86cd799439011');
  });

  it('returns the original string when there is no wrapper', () => {
    expect(objectId.exec('507f1f77bcf86cd799439011')).toBe('507f1f77bcf86cd799439011');
  });

  it('handles falsy input gracefully', () => {
    expect(objectId.exec(null)).toBe('');
  });

});

// ─────────────────────────────────────────────
// prefix
// ─────────────────────────────────────────────
describe('prefix filter', () => {

  it('prepends the prefix when not already present', () => {
    expect(prefix.exec('path/to', '/')).toBe('/path/to');
  });

  it('does not double-prepend if prefix already exists', () => {
    expect(prefix.exec('/path/to', '/')).toBe('/path/to');
  });

  it('handles empty string', () => {
    expect(prefix.exec('', '/')).toBe('/');
  });

});

// ─────────────────────────────────────────────
// suffix
// ─────────────────────────────────────────────
describe('suffix filter', () => {

  it('appends the suffix when not already present', () => {
    expect(suffix.exec('path/to', '/')).toBe('path/to/');
  });

  it('does not double-append if suffix already exists', () => {
    expect(suffix.exec('path/to/', '/')).toBe('path/to/');
  });

});

// ─────────────────────────────────────────────
// saveinteger
// ─────────────────────────────────────────────
describe('saveinteger filter', () => {

  it('returns true for a safe integer', () => {
    expect(saveinteger.exec(42)).toBe(true);
  });

  it('returns false for a number larger than MAX_SAFE_INTEGER', () => {
    expect(saveinteger.exec(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
  });

  it('returns false for a float', () => {
    expect(saveinteger.exec(3.14)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(saveinteger.exec('580937985977360003193018')).toBe(false);
  });

  it('returns true for 0', () => {
    expect(saveinteger.exec(0)).toBe(true);
  });

  it('returns true for negative safe integer', () => {
    expect(saveinteger.exec(-100)).toBe(true);
  });

});
