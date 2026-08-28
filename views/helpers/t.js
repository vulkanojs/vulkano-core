/**
 * Exposes i18next translation as a view helper.
 * Not the raw `i18n` global: Handlebars helpers must be callable functions,
 * not objects with methods — {{ i18n.t('key') }} works in Nunjucks but
 * throws in Handlebars ("fn is not a function") since its helper wrapper
 * invokes whatever is registered directly.
 *
 * Usage:
 *   Nunjucks:   {{ t('key') }}
 *   Handlebars: {{t "key"}}
 */
module.exports = (key, options) => i18n.t(key, options);
