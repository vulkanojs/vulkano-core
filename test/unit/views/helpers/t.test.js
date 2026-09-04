/**
 * t() view helper — unit tests
 */

const t = require('../../../../views/helpers/t');

describe('t() helper', () => {

  beforeEach(() => {
    global.i18n = { t: jest.fn().mockReturnValue('translated') };
  });

  it('delegates to global i18n.t with the given key', () => {
    const result = t('greeting');
    expect(global.i18n.t).toHaveBeenCalledWith('greeting', undefined);
    expect(result).toBe('translated');
  });

  it('forwards interpolation options to i18n.t', () => {
    t('greeting', { name: 'Iván' });
    expect(global.i18n.t).toHaveBeenCalledWith('greeting', { name: 'Iván' });
  });

});
