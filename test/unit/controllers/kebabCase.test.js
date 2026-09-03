/**
 * controllers.js — toKebabCase unit tests
 * Controller name -> URL segment conversion for multi-word PascalCase names.
 */

const { setupGlobals } = require('../helpers/globals');
setupGlobals();

const loadControllersApplication = require('../../../controllers/controllers');
const { toKebabCase } = loadControllersApplication;

describe('toKebabCase', () => {

  it('single-word name stays lowercase, no hyphen', () => {
    expect(toKebabCase('Myaccount')).toBe('myaccount');
  });

  it('multi-word PascalCase name gets hyphenated', () => {
    expect(toKebabCase('MyAccount')).toBe('my-account');
  });

  it('three-word PascalCase name gets hyphenated on every boundary', () => {
    expect(toKebabCase('MaterialReceptions')).toBe('material-receptions');
  });

});
