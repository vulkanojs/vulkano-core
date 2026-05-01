const merge = require('../../../libs/Merge');

// ─────────────────────────────────────────────
// Basic merge
// ─────────────────────────────────────────────
describe('Merge — basic', () => {

  it('adds keys from source that are not in target', () => {
    const result = merge({ a: 1 }, { b: 2 });
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('source value overwrites target for non-object keys', () => {
    const result = merge({ a: 1 }, { a: 2 });
    expect(result).toEqual({ a: 2 });
  });

  it('merges nested objects recursively', () => {
    const result = merge({ a: { b: 1 } }, { a: { c: 2 } });
    expect(result).toEqual({ a: { b: 1, c: 2 } });
  });

  it('does not mutate the target object', () => {
    const target = { a: 1 };
    merge(target, { b: 2 });
    expect(target).toEqual({ a: 1 });
  });

  it('does not mutate the source object', () => {
    const source = { b: 2 };
    merge({ a: 1 }, source);
    expect(source).toEqual({ b: 2 });
  });

  it('handles null values in source', () => {
    const result = merge({ a: 1 }, { a: null });
    expect(result.a).toBeNull();
  });

  it('handles undefined values in source', () => {
    const result = merge({ a: 1 }, { b: undefined });
    expect(result).toHaveProperty('b', undefined);
  });

  it('converts target scalar to source object when types differ', () => {
    const result = merge({ a: 'string' }, { a: { b: 1 } });
    expect(result.a).toEqual({ b: 1 });
  });

});

// ─────────────────────────────────────────────
// Array handling
// ─────────────────────────────────────────────
describe('Merge — arrays', () => {

  it('concatenates arrays by default', () => {
    const result = merge({ a: [1, 2] }, { a: [3, 4] });
    expect(result.a).toEqual([1, 2, 3, 4]);
  });

  it('merges top-level arrays', () => {
    const result = merge([1, 2], [3, 4]);
    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('clones array elements (no shared references)', () => {
    const obj = { x: 1 };
    const result = merge([obj], []);
    result[0].x = 99;
    expect(obj.x).toBe(1);
  });

  it('uses custom arrayMerge when provided', () => {
    const overwrite = (_target, source) => source;
    const result = merge({ a: [1, 2] }, { a: [3, 4] }, { arrayMerge: overwrite });
    expect(result.a).toEqual([3, 4]);
  });

  it('custom arrayMerge receives (target, source, options)', () => {
    const spy = jest.fn((_t, src) => src);
    merge({ a: [1] }, { a: [2] }, { arrayMerge: spy });
    expect(spy).toHaveBeenCalledWith([1], [2], expect.any(Object));
  });

  it('custom arrayMerge receives cloneUnlessOtherwiseSpecified in options', () => {
    let captured;
    merge({ a: [1] }, { a: [2] }, {
      arrayMerge: (_t, src, opts) => { captured = opts; return src; }
    });
    expect(typeof captured.cloneUnlessOtherwiseSpecified).toBe('function');
  });

});

// ─────────────────────────────────────────────
// Clone option
// ─────────────────────────────────────────────
describe('Merge — clone option', () => {

  it('deep clones nested objects by default', () => {
    const result = merge({ a: { b: 1 } }, { c: { d: 2 } });
    result.a.b = 99;
    expect(merge({ a: { b: 1 } }, {}).a.b).toBe(1);
  });

  it('clone: false reuses references instead of cloning', () => {
    const inner = { x: 1 };
    const result = merge({}, { a: inner }, { clone: false });
    expect(result.a).toBe(inner);
  });

});

// ─────────────────────────────────────────────
// isMergeableObject option
// ─────────────────────────────────────────────
describe('Merge — isMergeableObject option', () => {

  it('does not deep-merge objects when isMergeableObject returns false', () => {
    const isPlain = (val) => typeof val === 'object' && val !== null && val.constructor === Object;
    function Custom() { this.x = 1; }
    const instance = new Custom();
    const result = merge({ a: { x: 0 } }, { a: instance }, { isMergeableObject: isPlain });
    expect(result.a).toBe(instance);
  });

  it('RegExp is not deep-merged (default isMergeableObject)', () => {
    const re = /foo/;
    const result = merge({ a: /bar/ }, { a: re });
    expect(result.a).toBe(re);
  });

  it('Date is not deep-merged (default isMergeableObject)', () => {
    const date = new Date('2024-01-01');
    const result = merge({ a: new Date('2020-01-01') }, { a: date });
    expect(result.a).toBe(date);
  });

});

// ─────────────────────────────────────────────
// customMerge option
// ─────────────────────────────────────────────
describe('Merge — customMerge option', () => {

  it('uses customMerge function for the specified key', () => {
    const overwriteOnly = (_a, b) => b;
    const result = merge(
      { config: { port: 3000, debug: true } },
      { config: { port: 4000 } },
      { customMerge: (key) => (key === 'config' ? overwriteOnly : undefined) }
    );
    expect(result.config).toEqual({ port: 4000 });
  });

  it('uses default merge for keys not handled by customMerge', () => {
    const result = merge(
      { a: { x: 1 }, b: { y: 2 } },
      { a: { z: 3 }, b: { w: 4 } },
      { customMerge: (key) => (key === 'a' ? undefined : undefined) }
    );
    expect(result.a).toEqual({ x: 1, z: 3 });
    expect(result.b).toEqual({ y: 2, w: 4 });
  });

});

// ─────────────────────────────────────────────
// Symbol keys
// ─────────────────────────────────────────────
describe('Merge — symbol keys', () => {

  it('merges enumerable symbol keys', () => {
    const sym = Symbol('key');
    const result = merge({ [sym]: 1 }, { [sym]: 2 });
    expect(result[sym]).toBe(2);
  });

  it('copies symbol keys from target', () => {
    const sym = Symbol('key');
    const result = merge({ [sym]: 1 }, { b: 2 });
    expect(result[sym]).toBe(1);
  });

});

// ─────────────────────────────────────────────
// Prototype poisoning protection
// ─────────────────────────────────────────────
describe('Merge — prototype poisoning protection', () => {

  it('ignores __proto__ key to prevent prototype pollution', () => {
    const payload = JSON.parse('{"__proto__": {"polluted": true}}');
    merge({}, payload);
    expect({}.polluted).toBeUndefined();
  });

  it('ignores inherited (non-own) properties from source prototype', () => {
    function Source() {}
    Source.prototype.inherited = 'bad';
    const src = new Source();
    src.own = 'good';
    const result = merge({}, src);
    expect(result.own).toBe('good');
    expect(result.inherited).toBeUndefined();
  });

  it('merges objects created with Object.create(null)', () => {
    const target = Object.create(null);
    target.a = 1;
    const source = Object.create(null);
    source.b = 2;
    const result = merge(target, source);
    expect(result.a).toBe(1);
    expect(result.b).toBe(2);
  });

});

// ─────────────────────────────────────────────
// merge.all()
// ─────────────────────────────────────────────
describe('Merge.all()', () => {

  it('throws when first argument is not an array', () => {
    expect(() => merge.all('not an array')).toThrow('first argument should be an array');
  });

  it('returns empty object for empty array', () => {
    expect(merge.all([])).toEqual({});
  });

  it('returns clone of single element', () => {
    const obj = { a: 1 };
    const result = merge.all([obj]);
    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(obj);
  });

  it('merges multiple objects in order', () => {
    const result = merge.all([{ a: 1 }, { b: 2 }, { c: 3 }]);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('later objects overwrite earlier ones', () => {
    const result = merge.all([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(result.a).toBe(3);
  });

  it('merges nested objects across all items', () => {
    const result = merge.all([{ a: { x: 1 } }, { a: { y: 2 } }, { a: { z: 3 } }]);
    expect(result.a).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('accepts options as second argument', () => {
    const overwrite = (_t, src) => src;
    const result = merge.all([{ a: [1] }, { a: [2] }], { arrayMerge: overwrite });
    expect(result.a).toEqual([2]);
  });

  it('does not clone when clone: false', () => {
    const inner = { x: 1 };
    const result = merge.all([{}, { a: inner }], { clone: false });
    expect(result.a).toBe(inner);
  });

});
