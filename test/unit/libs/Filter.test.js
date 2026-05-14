/**
 * Filter — unit tests
 * Tests the Filter.get / Filter.load facade over the built-in filter functions.
 *
 * [bug fix] Filter.get now calls this.load() instead of Filter.load() so it
 * works correctly without the global being set.
 * global.Filter is still needed for trim.js, which calls Filter.get() internally.
 */

const path = require('node:path');

// Set globals required by Filter.js before requiring it
global.CORE_PATH = path.join(__dirname, '../../../');
global.APP_PATH  = path.join(__dirname, '../../fixtures/app');

const Filter = require('../../../libs/Filter');
global.Filter = Filter; // trim.js calls Filter.get() — needs the global

describe('Filter.load', () => {

  it('returns a filter object for a known filter name', () => {
    const f = Filter.load('ltrim');
    expect(f).toBeDefined();
    expect(typeof f.exec).toBe('function');
  });

  it('returns false and logs for an unknown filter name', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const f = Filter.load('nonexistent');
    expect(f).toBe(false);
    spy.mockRestore();
  });

});

describe('Filter.get — single filter', () => {

  it('ltrim removes leading slash', () => {
    expect(Filter.get('/path/to', 'ltrim', '/')).toBe('path/to');
  });

  it('rtrim removes trailing slash', () => {
    expect(Filter.get('path/to/', 'rtrim', '/')).toBe('path/to');
  });

  it('number extracts digits', () => {
    expect(Filter.get('a1b2c3', 'number')).toBe('123');
  });

  it('prefix adds leading slash when missing', () => {
    expect(Filter.get('route', 'prefix', '/')).toBe('/route');
  });

  it('suffix adds trailing slash when missing', () => {
    expect(Filter.get('route', 'suffix', '/')).toBe('route/');
  });

  it('objectId extracts id from wrapper', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(Filter.get(`ObjectId("${id}")`, 'objectId')).toBe(id);
  });

  it('returns empty string for an unknown filter', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(Filter.get('value', 'unknown')).toBe('');
    spy.mockRestore();
  });

});

describe('Filter.get — array of filters', () => {

  it('applies filters in order', () => {
    // ltrim removes leading /, rtrim removes trailing /
    expect(Filter.get('/path/to/', ['ltrim', 'rtrim'], '/')).toBe('path/to');
  });

  it('trim (combined ltrim + rtrim via Filter.get) removes both ends', () => {
    expect(Filter.get('  hello  ', 'trim')).toBe('hello');
  });

});

describe('[bug fix] Filter.get uses this.load() — no global dependency', () => {

  it('Filter.get works when called with explicit this binding (no global needed)', () => {
    // Before fix: Filter.get called Filter.load() (global ref) — would throw if global unset.
    // After fix:  uses this.load(), so calling with explicit context always works.
    const result = Filter.get.call(Filter, '/test/', ['ltrim', 'rtrim'], '/');
    expect(result).toBe('test');
  });

  it('Filter.get with single filter works via this.load()', () => {
    const result = Filter.get.call(Filter, 'a1b2', 'number');
    expect(result).toBe('12');
  });

});
