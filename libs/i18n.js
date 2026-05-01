const i18next = require('i18next');

module.exports = (() => {

  const {
    config
  } = app || {};

  let {
    locales: configLocales
  } = config || {};

  if (!configLocales) {
    configLocales = {
      en: {}
    };
  }

  const locales = Object.keys(configLocales);
  const resources = new Map();

  locales.forEach( (locale) => {
    resources.set(locale, { translation: configLocales[locale] });
  });

  // Change translations
  i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: Object.fromEntries(resources)
  });

  return i18next;

})();
