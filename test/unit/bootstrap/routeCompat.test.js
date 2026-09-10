const { toExpress5Path } = require('../../../bootstrap/routeCompat');

describe('toExpress5Path', () => {

  test('bare "*" (whole app, no leading slash) becomes an optional catch-all matching everything, including root', () => {
    expect(toExpress5Path('*')).toBe('/{*splat}');
  });

  test('bare "/*" (whole app, explicit leading slash) becomes the same optional catch-all', () => {
    expect(toExpress5Path('/*')).toBe('/{*splat}');
  });

  test('wildcard glued directly onto a literal prefix ("/admin*" SPA catch-all convention) becomes a named optional group', () => {
    expect(toExpress5Path('/admin*')).toBe('/admin{*splat}');
  });

  test('wildcard slash-separated onto a literal prefix ("/admin/*") also becomes a named optional group', () => {
    expect(toExpress5Path('/admin/*')).toBe('/admin/{*splat}');
  });

  test('already-normalized path (braced wildcard) is left untouched — idempotent', () => {
    expect(toExpress5Path('/admin{*splat}')).toBe('/admin{*splat}');
  });

  test('plain path with no wildcard is untouched', () => {
    expect(toExpress5Path('/user/:id')).toBe('/user/:id');
  });

  test('non-string, non-array input is returned as-is', () => {
    expect(toExpress5Path(undefined)).toBe(undefined);
  });

  test('array of paths — each element normalized independently', () => {
    expect(toExpress5Path(['/api', '/admin*'])).toEqual(['/api', '/admin{*splat}']);
  });

  test('array with only plain paths is untouched', () => {
    expect(toExpress5Path(['/api', '/custom-endpoint'])).toEqual(['/api', '/custom-endpoint']);
  });

  test('optional named param becomes an optional group (downstream app compat, not a Vulkano convention)', () => {
    expect(toExpress5Path('/user/:id?')).toBe('/user{/:id}');
  });

  test('optional param combined with a trailing static segment', () => {
    expect(toExpress5Path('/user/:id?/edit')).toBe('/user{/:id}/edit');
  });

  test('plain required param (no "?") is untouched', () => {
    expect(toExpress5Path('/user/:id')).toBe('/user/:id');
  });

});
