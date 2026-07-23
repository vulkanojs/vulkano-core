/* global Example */

/*
 * This endpoint is protected by JWT, please disabled it to test
 */

// This is an example for Full API Rest controller that provides CRUD operations.
// It is a good starting point for creating a RESTful API.
// The business logic is implemented in the Example model, which is a good practice
// to keep the controller thin and focused on handling requests and responses.

module.exports = {

  // Method to get all records from the model
  // Example: GET /projects/?page=1
  get(req, res) {

    // Status code: 200 (default)
    res.vsr(Example.getAll(req.query || {}));

  },

  // Method to create a new record in the model
  // Example: POST /projects/
  post(req, res) {

    const {
      body
    } = req || {};

    // Status code: 201 (created)
    res.vsr(Example.create(body), 201);

  },

  // Method to get a record by id from the model
  // Example: GET /projects/:id
  'get :id': (req, res) => {

    const {
      id
    } = req.params;

    // Status code: 200 (default)
    res.vsr(Example.getExample(id));

  },

  // Method to update a record by id in the model
  // Example: PUT /projects/:id
  'put :id': (req, res) => {

    const {
      id
    } = req.params;

    const {
      body
    } = req || {};

    // Status code: 202 (accepted)
    res.vsr(Example.update(id, body), 202);

  },

  // Method to delete a record by id from the model
  // Example: DELETE /projects/:id
  'delete :id': (req, res) => {

    const {
      id
    } = req.params;

    res.vsr(Example.remove(id), 204);

  }

};
