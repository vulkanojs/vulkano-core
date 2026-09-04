/**
 * vCamelCase filter — unit tests
 */

const vCamelCase = require('../../../../views/filters/vCamelCase');

describe('vCamelCase filter', () => {

  it('converts a snake_case string to PascalCase', () => {
    expect(vCamelCase('hello_world')).toBe('HelloWorld');
  });

  it('capitalizes a single word', () => {
    expect(vCamelCase('hello')).toBe('Hello');
  });

  it('lowercases the rest of each segment', () => {
    expect(vCamelCase('HELLO_WORLD')).toBe('HelloWorld');
  });

  it('collapses consecutive underscores without inserting empty segments', () => {
    expect(vCamelCase('hello__world')).toBe('HelloWorld');
  });

  it('returns empty string for falsy input', () => {
    expect(vCamelCase('')).toBe('');
    expect(vCamelCase(null)).toBe('');
    expect(vCamelCase(undefined)).toBe('');
  });

  it('coerces non-string input via String()', () => {
    expect(vCamelCase(123)).toBe('123');
  });

});
