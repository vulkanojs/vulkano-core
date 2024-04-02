const i18next = require('i18next');
const moment = require('moment');

require('moment/min/locales.min');

moment.locale('en');

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

  // catch the event and make changes accordingly
  i18next.on('languageChanged', (lng) => {

    try {
      moment.locale(lng);
    } catch (err) {
      console.log(err);
    }

  });

  return i18next;

})();
