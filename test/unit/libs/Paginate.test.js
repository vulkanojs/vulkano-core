/**
 * Paginate — unit tests
 * Pure functions only: no server, no DB required.
 */

const Paginate = require('../../../libs/Paginate');

// ─────────────────────────────────────────────
// accentToRegex
// ─────────────────────────────────────────────
describe('Paginate.accentToRegex', () => {

  it('expands letters with accented variants into character classes', () => {
    // 'e' has accented variants, so accentToRegex expands it to [e...] pattern
    const result = Paginate.accentToRegex('hello');
    expect(() => new RegExp(result, 'i')).not.toThrow();
    expect(new RegExp(result, 'i').test('hello')).toBe(true);
  });

  it('result is a valid regex pattern for text with accented characters', () => {
    const result = Paginate.accentToRegex('résumé');
    expect(() => new RegExp(result)).not.toThrow();
  });

  it('generated pattern matches both plain and accented variants', () => {
    const pattern = Paginate.accentToRegex('e');
    const re = new RegExp(pattern, 'i');
    // The character class built for 'e' must match 'e' and its accented sibling 'é'
    expect(re.test('e')).toBe(true);
    expect(re.test('é')).toBe(true);
  });

});

// ─────────────────────────────────────────────
// _set — pagination metadata
// ─────────────────────────────────────────────
describe('Paginate._set', () => {

  it('page 1 of 2: cursor=1, next=2, prev=false', () => {
    const result = Paginate._set(30, [], 1, 15);
    expect(result.cursor).toBe(1);
    expect(result.next).toBe(2);
    expect(result.prev).toBe(false);
    expect(result.totalPages).toBe(2);
    expect(result.totalItems).toBe(30);
  });

  it('page 2 of 2: cursor=16, next=false, prev=1', () => {
    const result = Paginate._set(30, [], 2, 15);
    expect(result.cursor).toBe(16);
    expect(result.next).toBe(false);
    expect(result.prev).toBe(1);
  });

  it('page 3 beyond total: next=false, prev=false (out-of-range page)', () => {
    const result = Paginate._set(30, [], 3, 15);
    expect(result.next).toBe(false);
    expect(result.prev).toBe(false);
  });

  it('single page: next=false, prev=false', () => {
    const result = Paginate._set(5, [], 1, 15);
    expect(result.next).toBe(false);
    expect(result.prev).toBe(false);
    expect(result.totalPages).toBe(1);
  });

  it('empty result set: cursor=1', () => {
    const result = Paginate._set(0, [], 1, 15);
    expect(result.cursor).toBe(1);
    expect(result.totalItems).toBe(0);
  });

  it('passes items array through unchanged', () => {
    const items = [{ id: 1 }, { id: 2 }];
    const result = Paginate._set(2, items, 1, 15);
    expect(result.items).toBe(items);
  });

  // Regression: <= vs < bug — page 2 of exactly 2 pages must have next=false
  it('[bug fix] last page of even split does not show next page', () => {
    const result = Paginate._set(30, [], 2, 15);
    expect(result.next).toBe(false);
  });

});

// ─────────────────────────────────────────────
// serializeQuery
// ─────────────────────────────────────────────
describe('Paginate.serializeQuery', () => {

  const baseProps = {
    sort: 'createdAt|DESC',
    searchBy: ['name'],
    filter: { active: true }
  };

  it('returns default page=1 and perPage=30 when query is empty', () => {
    const result = Paginate.serializeQuery(baseProps, {});
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(30);
  });

  it('uses page and per_page from query', () => {
    const result = Paginate.serializeQuery(baseProps, { page: 2, per_page: 10 });
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(10);
  });

  it('no search term: search object contains only the filter', () => {
    const result = Paginate.serializeQuery(baseProps, {});
    expect(result.search).toEqual({ active: true });
  });

  it('search term + filter: uses $and with filter and $or', () => {
    const result = Paginate.serializeQuery(baseProps, { search: 'hello' });
    expect(result.search.$and).toBeDefined();
    expect(result.search.$and[0]).toEqual({ active: true });
    expect(result.search.$and[1].$or).toBeDefined();
  });

  it('search term without filter: uses $or only', () => {
    const propsNoFilter = { searchBy: ['name'], filter: {} };
    const result = Paginate.serializeQuery(propsNoFilter, { search: 'hello' });
    expect(result.search.$or).toBeDefined();
    expect(result.search.$and).toBeUndefined();
  });

  it('searchType=startwith uses ^ anchor in regex', () => {
    const result = Paginate.serializeQuery(
      { searchBy: ['name'], filter: {} },
      { search: 'foo', searchType: 'startwith' }
    );
    expect(result.search.$or[0].name.source).toMatch(/^\^/);
  });

  it('searchType=endwith uses $ anchor in regex', () => {
    const result = Paginate.serializeQuery(
      { searchBy: ['name'], filter: {} },
      { search: 'foo', searchType: 'endwith' }
    );
    expect(result.search.$or[0].name.source).toMatch(/\$$/);
  });

  it('searchBy String field creates a RegExp for that field', () => {
    const result = Paginate.serializeQuery(
      { searchBy: ['name'], filter: {} },
      { search: 'foo' }
    );
    expect(result.search.$or[0].name).toBeInstanceOf(RegExp);
    expect(result.search.$or[0].name.test('foo')).toBe(true);
  });

  it('[bug fix] special regex chars in search term are escaped', () => {
    expect(() => {
      Paginate.serializeQuery(baseProps, { search: '(((' });
    }).not.toThrow();
  });

  it('[bug fix] backslash in search term does not throw', () => {
    expect(() => {
      Paginate.serializeQuery(baseProps, { search: 'test\\value' });
    }).not.toThrow();
  });

  it('filterByOr array appends items to the search $or', () => {
    const propsWithOr = {
      searchBy: [],
      filter: {},
      filterByOr: [{ status: 'active' }, { status: 'pending' }]
    };
    const result = Paginate.serializeQuery(propsWithOr, {});
    expect(result.search.$or).toBeDefined();
    expect(result.search.$or).toHaveLength(2);
  });

});

// ─────────────────────────────────────────────
// getPopulatedCollections
// ─────────────────────────────────────────────
describe('Paginate.getPopulatedCollections', () => {

  it('returns empty array for empty populate list', () => {
    expect(Paginate.getPopulatedCollections([])).toEqual([]);
  });

  it('builds path-based populate from collection name', () => {
    const result = Paginate.getPopulatedCollections([{ collection: 'user' }]);
    expect(result[0]).toEqual({ path: 'user' });
  });

  it('includes select when fields are specified', () => {
    const result = Paginate.getPopulatedCollections([{ collection: 'user', fields: 'name email' }]);
    expect(result[0].select).toBe('name email');
  });

  it('passes virtual object directly', () => {
    const virtual = { ref: 'User', localField: '_id', foreignField: 'owner' };
    const result = Paginate.getPopulatedCollections([{ virtual }]);
    expect(result[0]).toBe(virtual);
  });

});
