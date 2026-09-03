/**
 * View
 *
 * Renders a view to an HTML string without sending an HTTP response —
 * useful for email bodies, PDF generation, or any place that needs
 * rendered markup outside the normal request/response cycle.
 */

module.exports = {

  render(view, data) {
    return new Promise((resolve, reject) => {
      app.vulkano.render(view, data, (err, html) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(html);
      });
    });
  }

};
