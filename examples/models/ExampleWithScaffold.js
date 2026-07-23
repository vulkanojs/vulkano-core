/**
 * ExampleWithScaffold.js
 */

// This is an example for a simple model that provides CRUD operations with a scaffold.
// Provide a flexible way to implement business logic in the model, which is a good practice
// to keep the controller thin and focused on handling requests and responses.

// Scaffold (Model name: ExampleWithScaffold) - Allowed Methods:
// ExampleWidthScaffold.getAllExampleWidthScaffold(props) { page, perPage, search, sort }
// ExampleWidthScaffold.getAll(props) (alias to getAllModelName)
// ExampleWidthScaffold.create(payload) { name, age }
// ExampleWidthScaffold.getByField(email, 'email') (alias)
// ExampleWidthScaffold.getExampleWidthScaffold(id)
// ExampleWidthScaffold.update(id, payload)
// ExampleWidthScaffold.delete(id)

module.exports = {

  /**
   * Fillable fields for the update method
   * to prevent update of non-allowed fields like createdAt, updatedAt, etc.
   * @type Array
   */
  fillable: ['name', 'age'],

  /**
   * Fields
   */
  attributes: {
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: false,
      validate: {
        validator: (value) => {
          const isValid = (value >= 21) ? true : false;
          return isValid;
        },
        message: 'Invalid Age: Must be +21.',
      }
    },
    // the fields:
    // active, createdAt, updatedAt
    // was created automatically
  }

};
