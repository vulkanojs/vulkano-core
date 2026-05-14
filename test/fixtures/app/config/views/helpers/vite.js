module.exports = (options) => {
  const { entry, type } = options;

  if (!app.vite.manifest[entry]) {
    return `<!-- Vite entry ${entry} not found -->`;
  }

  if (type === 'style' || type === 'styles') {
    return app.vite.manifest[entry].css
      .map(file => `<link rel="stylesheet" href="/${file}?v=${app.pkg.version}">`)
      .join('');
  }

  if (type === 'script') {
    if (process.env.NODE_ENV === 'development') {
      return `<script type="module" src="/@vite/client"></script><script type="module" src="/${entry}"></script>`;
    }
    return `<script type="module" src="/${app.vite.manifest[entry].file}?v=${app.pkg.version}"></script>`;
  }

  return '';
};
