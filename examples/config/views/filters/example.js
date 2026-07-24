// Filter-style helper (positional arg):
// Nunjucks: {{ 'hello' | example }}
// Handlebars: {{ example 'hello' }}
module.exports = (str) => {
  return (str || '').split('').join(' ');
};
