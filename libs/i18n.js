const i18next = require('i18next');
const merge = require('./Merge');

const coreLocales = {
  en: require('../config/locales/en'),
  es: require('../config/locales/es')
};

module.exports = (() => {

  const {
    config
  } = app || {};

  const {
    locales: projectLocales
  } = config || {};

  const configLocales = merge.all([coreLocales, projectLocales || {}]);

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
