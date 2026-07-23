// This is an example for a simple controller that renders a view.
// It is a good starting point for creating a simple web application.

module.exports = {

  // Method to render the home page
  // Example: domain.com/example/
  get(req, res) {

    res.render('example/index.html', { title: 'This is an example home page' });

  },

  // Method to render the about page
  // Example: domain.com/example/about/
  about(req, res) {

    res.render('example/about.html', { title: 'This is an example about page' });

  }

};
