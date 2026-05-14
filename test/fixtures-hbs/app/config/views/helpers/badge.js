// Hash-style helper (same pattern as the Vite helper):
// Nunjucks: {{ badge({ label: 'v1', color: 'green' }) }}
// Handlebars: {{{badge label="v1" color="green"}}}
module.exports = (options) => {
  const { label, color } = options;
  return `<span class="badge" style="color:${color}">${label}</span>`;
};
