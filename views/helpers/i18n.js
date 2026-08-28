/**
 * Bridges the global `i18n` instance (set by bootstrap/services.js) into the
 * Nunjucks environment. Without this, `i18n` exists only in JS scope — views
 * never receive it, since nunjucks.js only auto-adds `app` as a global.
 *
 * Usage in templates: {{ i18n.t('key') }}
 */
module.exports = i18n;
