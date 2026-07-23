/* global app */

/**
 * Alias Route Mappings
 *
 * Your routes map URLs to views and controllers.
 *
 * Notes: Vulkano automatically matches the URL to a controller
 * and HTTP method (get, post, put, delete) ;)
 *
 * Example:
 * - GET /users/ -> File: UsersController, Method: 'get': (req, res) => {}
 * - GET /users/123 -> File: UsersController, Method: 'get :id': (req, res) => {}
 * - POST /users/ -> File: UsersController, Method: 'post': (req, res) => {}
 * - PUT /users/123 -> File: UsersController, Method: 'put :id': (req, res) => {}
 * - DELETE /users/123 -> File: UsersController, Method: 'delete :id': (req, res) => {}
 *
 * With nested folders, the same rules apply:
 * - GET /api/users/123 -> Folder: api -> File: UsersController, Method: 'get :id': (req, res) => {}
 *
 * But you can write your own routes manually :P
 *
 */

module.exports = {

  // Routes as string - Simple and easy to use
  '/about-me': 'AboutController.get',

  // Catch-all for React/Vue Router (SPA)
  '/admin*': 'AdminController.get',

  // Routes as definition - Most flexible
  '/test': (req, res) => {
    res.json({ message: 'Hello, world!' });
  },

  // Routes as method - More Advanced
  custom() {

    app.vulkano.get('/test', (req, res) => {
      res.json({ hello: 'world' });
    });

    app.vulkano.get('/test2', (req, res) => {
      res.json({ hello: 'world2' });
    });

    app.vulkano.get('/test3', (req, res) => {
      res.json({ hello: 'world3' });
    });

  }

};
