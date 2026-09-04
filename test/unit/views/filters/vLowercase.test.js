/**
 * vLowercase filter — unit tests
 */

const vLowercase = require('../../../../views/filters/vLowercase');

describe('vLowercase filter', () => {

  it('replaces spaces with underscores and lowercases', () => {
    expect(vLowercase('Hello World')).toBe('hello_world');
  });

  it('lowercases a string with no spaces', () => {
    expect(vLowercase('HELLO')).toBe('hello');
  });

  it('replaces multiple spaces with one underscore each', () => {
    expect(vLowercase('a b  c')).toBe('a_b__c');
  });

  it('returns empty string for falsy input', () => {
    expect(vLowercase('')).toBe('');
    expect(vLowercase(null)).toBe('');
    expect(vLowercase(undefined)).toBe('');
  });

  it('coerces non-string input via String()', () => {
    expect(vLowercase(123)).toBe('123');
  });

});
