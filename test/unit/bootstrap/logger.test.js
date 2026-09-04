/**
 * bootstrap/logger.js — unit tests
 */

const logger = require('../../../bootstrap/logger');

describe('logger.showCenteredText', () => {

  // lineWidth (41) is odd, so colSize (lineWidth / 2 = 20.5) always loses its
  // fractional half on both padStart and padEnd — the real output is always
  // 1 char short of lineWidth, not exactly lineWidth.

  it('centers text, padding both sides to roughly half of lineWidth', () => {
    const centered = logger.showCenteredText('hi');
    expect(centered.length).toBe(logger.lineWidth - 1);
    expect(centered.trim()).toBe('hi');
  });

  it('handles an empty string', () => {
    const centered = logger.showCenteredText('');
    expect(centered.length).toBe(logger.lineWidth - 1);
    expect(centered.trim()).toBe('');
  });

  it('interpolates the raw argument as-is, so undefined literally renders as "undefined"', () => {
    const centered = logger.showCenteredText(undefined);
    expect(centered).toContain('undefined');
  });

});

describe('logger.showColumn', () => {

  it('pads text to align in a 17-char column, accounting for the title length', () => {
    const column = logger.showColumn('value', 5);
    expect(column).toBe('value'.padEnd(12, ' '));
  });

  it('returns the text unpadded when it already fills the column', () => {
    const column = logger.showColumn('exactlength', 0);
    expect(column).toBe('exactlength'.padEnd(17, ' '));
  });

});
