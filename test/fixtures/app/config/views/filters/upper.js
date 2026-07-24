// Filter-style helper (positional arg):
// Nunjucks: {{ username | upper }}
// Handlebars: {{upper username}}
module.exports = (str) => String(str || '').toUpperCase();
