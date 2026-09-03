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

// PascalCase controller name -> kebab-case URL segment (MyAccount -> my-account)
function toKebabCase(str) {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

module.exports = function loadControllersApplication() {

  const routes = {};

  Object.keys(AllControllers).forEach( (controller) => {

    const methods = ['get', 'post', 'put', 'patch', 'delete'];
    const current = AllControllers[controller];

    const {
      scaffold,
      allowedMethods,
      model
    } = current;

    // `scaffold` can be `true` + a separate `model` field, or the model
    // name given directly as the `scaffold` string (no `model` needed).
    const scaffoldModel = typeof scaffold === 'string' ? scaffold : model;

    if (scaffold && scaffoldModel) {

      if (!global[scaffoldModel]) {
        throw new Error(`Scaffold model "${scaffoldModel}" not found in global scope for controller "${controller}". Make sure the model exists in app/models.`);
      }

      const scaffoldingCurrent = scaffoldController(scaffoldModel, allowedMethods);

      Object.keys(scaffoldingCurrent).forEach( (m) => {

        if (!current[m]) {
          current[m] = scaffoldingCurrent[m];
        }

      });

    }

    let controllerName = toKebabCase(controller.replace('Controller', ''));

    let parts = [];
    let method = 'get';
    let pathToRun = '';
    let moduleName = '';

    Object.keys(current || []).forEach( (route) => {

      // Is a submodule (like api/TestController)
      if (route.split('Controller').length > 1) {

        moduleName = controllerName;
        const submodules = AllControllers[moduleName];

        Object.keys(submodules || []).forEach( (subcontroller) => {

          controllerName = toKebabCase(subcontroller.replace('Controller', ''));
          const subcurrent = submodules[subcontroller];

          const {
            scaffold: subcurrentScaffold,
            allowedMethods: subAllowedMethods,
            model: subcurrentModel
          } = subcurrent || {};

          const subScaffoldModel = typeof subcurrentScaffold === 'string' ? subcurrentScaffold : subcurrentModel;

          if (subcurrentScaffold && subScaffoldModel) {

            if (!global[subScaffoldModel]) {
              throw new Error(`Scaffold model "${subScaffoldModel}" not found in global scope for controller "${subcontroller}". Make sure the model exists in app/models.`);
            }

            const scaffoldingSubcurrent = scaffoldController(subScaffoldModel, subAllowedMethods);

            Object.keys(scaffoldingSubcurrent).forEach( (m) => {

              if (!subcurrent[m]) {
                subcurrent[m] = scaffoldingSubcurrent[m];
              }

            });

          }

          Object.keys(subcurrent || []).forEach( (subroute) => {

            parts = subroute.split(' ');

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

              if (methods.indexOf(pathToRun.toLowerCase()) >= 0) {
                method = pathToRun.toLowerCase();
                pathToRun = `/${moduleName}/${controllerName}/`;
              } else {
                pathToRun = `/${moduleName}/${controllerName}/${pathToRun.replace(/GET|POST|DELETE|PUT|PATCH/i, '')}`;
              }

            }

            if (typeof subcurrent[subroute] === 'function') {
              routes[`${method} ${pathToRun}`] = subcurrent[subroute];
            }

          });
        });

      } else {

        parts = route.split(' ');
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
          if (methods.indexOf(pathToRun.toLowerCase()) >= 0) {
            method = pathToRun.toLowerCase();
            pathToRun = `/${controllerName}/`;
          } else {
            pathToRun = `/${controllerName}/${pathToRun.replace(/GET|POST|DELETE|PUT|PATCH/i, '')}`;
          }
        }

        if (typeof current[route] === 'function') {
          routes[`${method} ${pathToRun}`] = current[route];
        }

      }

    });

  });

  return routes;

};

module.exports.toKebabCase = toKebabCase;
