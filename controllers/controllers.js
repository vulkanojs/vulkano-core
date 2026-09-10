/**
 * Controllers
 */

// Include all api controllers
const AllControllers = require('include-all')({
  dirname: `${APP_PATH}/controllers`,
  filter: /(.+Controller)\.js$/,
  optional: true
});

const scaffoldController = require('./ScaffoldController');
const { toExpress5Path } = require('../bootstrap/routeCompat');

// PascalCase controller name -> kebab-case URL segment (MyAccount -> my-account)
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

const methods = ['get', 'post', 'put', 'patch', 'delete'];

module.exports = function loadControllersApplication() {

  const routes = {};

  // Registers all routes found in a single controller definition object,
  // namespaced under the given module path segments (possibly empty).
  function processController(controllerFileName, current, modulePathSegments) {

    const {
      scaffold,
      allowedMethods,
      model
    } = current || {};

    // `scaffold` can be `true` + a separate `model` field, or the model
    // name given directly as the `scaffold` string (no `model` needed).
    const scaffoldModel = typeof scaffold === 'string' ? scaffold : model;

    if (scaffold && scaffoldModel) {

      if (!global[scaffoldModel]) {
        throw new Error(`Scaffold model "${scaffoldModel}" not found in global scope for controller "${controllerFileName}". Make sure the model exists in app/models.`);
      }

      const scaffoldingCurrent = scaffoldController(scaffoldModel, allowedMethods);

      Object.keys(scaffoldingCurrent).forEach( (m) => {

        if (!current[m]) {
          current[m] = scaffoldingCurrent[m];
        }

      });

    }

    const controllerName = toKebabCase(controllerFileName.replace('Controller', ''));
    const namespace = modulePathSegments.join('/');

    Object.keys(current || []).forEach( (route) => {

      let method = 'get';
      let pathToRun = '';

      const parts = route.split(' ');
      const [tmpMethod, tmpPath] = parts;

      if (tmpPath) {
        if (methods.indexOf(tmpMethod.toLowerCase()) >= 0) {
          method = tmpMethod.toLowerCase();
          pathToRun = tmpPath;
        } else {
          // First token isn't a real HTTP method — default to GET,
          // treating the whole key as the path (e.g. 'edit :id' → GET .../edit/:id)
          method = 'get';
          pathToRun = parts.join('/');
        }
      } else {
        pathToRun = tmpMethod;
      }

      const isAbsolute = (pathToRun.substring(0, 1) === '/') ? true : false;

      if (!isAbsolute) {

        const base = namespace ? `/${namespace}/${controllerName}/` : `/${controllerName}/`;

        if (methods.indexOf(pathToRun.toLowerCase()) >= 0) {
          method = pathToRun.toLowerCase();
          pathToRun = base;
        } else {
          pathToRun = `${base}${pathToRun.replace(/GET|POST|DELETE|PUT|PATCH/i, '')}`;
        }

      }

      if (typeof current[route] === 'function') {
        routes[`${method} ${toExpress5Path(pathToRun)}`] = current[route];
      }

    });

  }

  // Walks the (possibly nested) AllControllers tree. A key ending in
  // "Controller" is a controller file; any other key is a module/namespace
  // folder whose value is another node to recurse into.
  function processNode(node, modulePathSegments) {

    Object.keys(node || []).forEach( (key) => {

      const value = node[key];

      if (/Controller$/.test(key)) {
        processController(key, value, modulePathSegments);
      } else {
        processNode(value, [...modulePathSegments, toKebabCase(key)]);
      }

    });

  }

  processNode(AllControllers, []);

  return routes;

};

module.exports.toKebabCase = toKebabCase;
