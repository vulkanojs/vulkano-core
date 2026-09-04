/**
 * i18n — unit tests
 * The module is an IIFE that reads global.app.config.locales at require time,
 * so each test resets the module registry to get a fresh init.
 */

describe('i18n', () => {

  beforeEach(() => {
    jest.resetModules();
  });

  it('loads the core en/es locales when no project locales are configured', () => {
    global.app = { config: {} };
    const i18n = require('../../../libs/i18n');

    expect(i18n.t('upload.notUploaded')).toBe('The file could not be uploaded');
    expect(i18n.t('upload.notUploaded', { lng: 'es' })).not.toBe('upload.notUploaded');
  });

  it('defaults the language to "en"', () => {
    global.app = { config: {} };
    const i18n = require('../../../libs/i18n');

    expect(i18n.language).toBe('en');
  });

  it('merges project-provided locales on top of the core ones', () => {
    global.app = {
      config: {
        locales: {
          en: { upload: { notUploaded: 'Custom upload error' } },
          fr: { upload: { notUploaded: 'Erreur de téléchargement' } }
        }
      }
    };
    const i18n = require('../../../libs/i18n');

    expect(i18n.t('upload.notUploaded')).toBe('Custom upload error');
    expect(i18n.t('upload.notUploaded', { lng: 'fr' })).toBe('Erreur de téléchargement');
  });

  it('interpolates variables into the translated string (HTML-escaped by i18next default)', () => {
    global.app = { config: {} };
    const i18n = require('../../../libs/i18n');

    expect(i18n.t('upload.invalidMimeType', { mimetype: 'image/svg' }))
      .toBe('The MIME type of the selected file is not allowed: image&#x2F;svg');
  });

});
