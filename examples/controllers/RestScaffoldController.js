/*
 * This endpoint is protected by JWT, please disable it to test
 */

// Scaffold Controller is a controller that provides CRUD operations for a model.
// It is a generic controller that can be used to create, read, update, and delete records
// from a model. It is a good starting point for creating a
// RESTful API.

module.exports = {

  // Extend methods of Scaffold Controller and Scaffold Model
  scaffold: true,

  // Allowed methods
  allowedMethods: ['get', 'post', 'put', 'delete'],

  // Model to CRUD (create, read, update, and delete) records
  model: 'ExampleWithScaffold'

};
