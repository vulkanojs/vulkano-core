/* global mongoose */

/**
 * Server.js
 */

const express = require('express');
const frameguard = require('frameguard');
const { Server } = require('socket.io');
const nunjucks = require('nunjucks');
const morgan = require('morgan');
const compression = require('compression');
const multer = require('multer');
const helmet = require('helmet');
const timeout = require('connect-timeout');
const useragent = require('express-useragent');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const { createClient: socketRedis } = require('redis');
const socketMongoose = require('mongoose');
const { createAdapter: socketRedisAdapter } = require('@socket.io/redis-adapter');
const { createAdapter: socketMongoAdapter } = require('@socket.io/mongo-adapter');

// Include all api controllers
const AllControllers = require('include-all')({
  dirname: `${APP_PATH}/controllers`,
  filter: /(.+Controller)\.js$/,
  optional: true
});

// Views Config
const viewsConfig = require('./views');

// JWT Middleware
const jwtMiddleware = require('../libs/Jwt');

// Express Config
const expressConfig = require('./express')();

// Express Responses
const responses = require('./responses');

module.exports = function loadServer() {

  return {

    routes: {},

    start: async function startServerApplication(cb) {

      // Get ENV Vars
      const {
        JWT_SECRET_KEY,
        COOKIES_SECRET_KEY
      } = process.env || {};

      const vulkano = express();

      // Settings
      vulkano.enable('trust proxy');

      // ---------------
      // PORT - File: app/config/express/settings.js
      // ---------------
      vulkano.set('port', expressConfig.port);

      // ---------------
      // MULTER - File: app/config/express/multer.js
      // ---------------
      const upload = multer(expressConfig.multer);

      // ---------------
      // MORGAN - File: app/config/express/morgan.js
      // ---------------
      vulkano.use(morgan(expressConfig.morgan.format, expressConfig.morgan));

      // ---------------
      // USER AGENT
      // ---------------
      vulkano.use(useragent.express());

      // ---------------
      // COMPRESSION - File: app/config/express/compression.js
      // ---------------
      vulkano.use(compression( expressConfig.compression || {} ));

      // ---------------
      // COOKIES - File: app/config/express/cookies.js
      // ---------------
      const {
        enabled: cookiesEnabled
      } = expressConfig.cookies || {};

      let cookiesSecretKey = null;

      if (cookiesEnabled) {

        cookiesSecretKey = COOKIES_SECRET_KEY || expressConfig.cookies.key || expressConfig.cookies.secret || '';

        if (!cookiesSecretKey) {
          console.log(' \x1b[33mWARNING\x1b[0m: Set the secret key in the config/express/cookie.js file or COOKIES_SECRET_KEY in the .env file.');
        }

        vulkano.use(cookieParser(cookiesSecretKey));

      }

      // ---------------
      // EXPRESS JSON - File: app/config/express/json.js
      // ---------------
      vulkano.use(express.json(expressConfig.json));

      // ---------------
      // EXPRESS FORM DATA - File: app/config/express/urlencoded.js
      // ---------------
      vulkano.use(express.urlencoded(expressConfig.urlencoded));

      // ---------------
      // HELMET - File: app/config/express/helmet.js
      // ---------------
      vulkano.use(helmet(expressConfig.helmet));

      // ---------------
      // RESPONSES
      // ---------------
      vulkano.use(responses);

      // ---------------
      // FRAMEGUARD - File: app/config/express/frameguard.js
      // ---------------
      if (expressConfig.frameguard) {
        if (Array.isArray(expressConfig.frameguard)) {
          expressConfig.frameguard.forEach( (frame) => {
            vulkano.use(frameguard(frame));
          });
        } else {
          vulkano.use(frameguard(expressConfig.frameguard));
        }
      }

      // ---------------
      // PROTOCOL & POWERED BY - File: app/config/settings.js
      // ---------------
      vulkano.use( (req, res, next) => {

        const proto = req.secure ? 'https' : 'http';
        const forwarded = req.headers['x-forwaded-proto'] || null;
        const currentProtocol = (forwarded || proto).split('://')[0];
        req.protocol = currentProtocol;

        if (expressConfig.poweredBy) {
          res.setHeader('X-Powered-By', expressConfig.poweredBy);
        }

        next();

      });

      // ---------------
      // REQUEST OPTIONS - File: app/config/express/cors.js
      // ---------------
      vulkano.options('*', (req, res) => {

        // ---------------
        // CORS
        // ---------------
        if (expressConfig.cors && expressConfig.cors.enabled) {
          let tmpCustomHeaders = ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept'];
          tmpCustomHeaders = tmpCustomHeaders.concat(expressConfig.cors.headers || []);
          res.header('Access-Control-Allow-Origin', expressConfig.cors.origin);
          res.header('Access-Control-Allow-Headers', tmpCustomHeaders.join(', '));
        } else {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
        }
        res.header('Allow', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');

        res.status(200).end();

      });

      // ---------------
      // TIMEOUT - File: app/config/settings.js
      // ---------------
      vulkano.use(timeout( expressConfig.timeout || 120000 ));

      vulkano.use( (req, res, next) => {
        if (!req.timedout) {
          next();
        }
      });

      // ---------------
      // JWT - File: app/config/express/jwt.js
      // ---------------
      if (expressConfig.jwt && expressConfig.jwt.enabled) {

        const jwtSecretKey = JWT_SECRET_KEY || expressConfig.jwt.key || expressConfig.jwt.secret || '';
        if (!jwtSecretKey) {
          console.log(' \x1b[41mERROR\x1b[0m: Can not get key in config/express/jwt.js file or JWT_SECRET_KEY in .env file');
          return;
        }

        // JWT (secret key)
        vulkano.use(expressConfig.jwt.path || '*', jwtMiddleware.init().unless({
          path: expressConfig.jwt.ignore || []
        }));

        // JWT  Handler error
        vulkano.use((err, req, res, next) => {
          if (err && err.name === 'UnauthorizedError') {
            res.status(401).jsonp({ success: false, error: 'Invalid token' });
          } else {
            next();
          }
        });

      }

      // ---------------
      // CORS - File: app/config/express/cors.js
      // ---------------
      if (expressConfig.cors && expressConfig.cors.enabled) {

        vulkano.use(expressConfig.cors.path, (req, res, next) => {

          // Enable CORS.
          let tmpCorsHeaders = ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept'];
          tmpCorsHeaders = tmpCorsHeaders.concat(expressConfig.cors.headers || []);

          res.header('Access-Control-Allow-Origin', expressConfig.cors.origin);
          res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
          res.header('Access-Control-Allow-Headers', tmpCorsHeaders.join(', '));

          // Disable CACHE in API resources.
          res.header('Cache-Control', 'no-cache, no-store, must-revalidate'); // HTTP 1.1.
          res.header('Pragma', 'no-cache'); // HTTP 1.0.
          res.header('Expires', '0'); // Proxies.

          next();

        });
      }

      // ---------------
      // Express Session  - File: app/config/express/session.js
      // ---------------
      const {
        enabled: sessionEnabled
      } = expressConfig.session || {};

      if (sessionEnabled) {

        if (!cookiesEnabled) {
          console.log(' \x1b[41mERROR\x1b[0m: Can not load the Express Session because the Cookies aren\'t enabled');
          return;
        }

        delete expressConfig.session.enabled;

        vulkano.use(expressSession({ ...expressConfig.session, secret: cookiesSecretKey }));

      }

      // ---------------
      // Content Security Policy  - File: app/config/express/csp.js
      // ---------------
      const {
        enabled: cspEnabled,
        report: cspReportTo,
        rules: cspRules
      } = expressConfig.csp || {};

      if (cspEnabled && cspRules) {

        const cspRulesHeader = [];

        if (Array.isArray(cspRules) && cspRules.length > 0) {

          for ( let i = 0; i < cspRules.length; i += 1) {
            cspRulesHeader.push(cspRules[i]);
          }

        } else if (typeof cspRules === 'object') {

          Object.keys(cspRules).forEach( (r) => {
            const tmpValues = cspRules[r];
            if (Array.isArray(tmpValues)) {
              cspRulesHeader.push(`${r} ${tmpValues.join(' ')}`);
            } else if (typeof tmpValues === 'string') {
              cspRulesHeader.push(`${r} ${tmpValues}`);
            }
          });

        } else if (typeof cspRules === 'string') {

          cspRulesHeader.push(cspRules);

        }

        // Has Rules
        if (cspRulesHeader.length > 0) {

          vulkano.use( (req, res, next) => {

            if (cspReportTo) {
              res.setHeader('Report-To', JSON.stringify(cspReportTo));
            }

            res.setHeader('Content-Security-Policy', cspRulesHeader.join('; '));

            next();

          });

        }

      }

      // ---------------
      // Permission Policy - File: app/config/express/permissionPolicy.js
      // ---------------
      const {
        enabled: ppEnabled,
        permissions: ppPermissions
      } = expressConfig.permissionPolicy || {};

      if (ppEnabled) {

        if (!Array.isArray(ppPermissions)) {
          console.error('Vulkano Error: ', 'The Permission Policy values must be an array');
          return;
        }

        if (ppPermissions.length > 0) {

          vulkano.use( (req, res, next) => {

            res.setHeader('Permissions-Policy', ppPermissions.join(', '));

            next();

          });

        }

      }

      // ---------------
      // REDIS - File: app/config/redis.js
      // ---------------
      const {
        enabled: redisEnabled
      } = app.config.redis || {};

      app.redisClient = null;

      if (redisEnabled === true) {

        const {
          redis
        } = app.config || {};

        const rClient = socketRedis(redis);
        rClient.on('error', (err) => console.log('Redis Client Error', err));

        app.redisClient = await rClient.connect();

      }

      // ---------------
      // VIEWS
      // ---------------

      const views = {
        ...viewsConfig,
        ...(app.server.views || {})
      };

      vulkano.set('views', views.path);

      const {
        settings: nunjucksSettingsUser
      } = views || {};

      const nunjucksSettings = {
        autoescape: true,
        watch: !app.PRODUCTION,
        ...(nunjucksSettingsUser || {}),
        express: vulkano
      };

      const envNunjucks = nunjucks.configure([views.path, CORE_PATH], nunjucksSettings);

      app.server.views._engine = envNunjucks;

      envNunjucks.addGlobal('app', app);

      if (views.globals && Array.isArray(views.globals)) {
        views.globals.forEach((global) => {
          Object.keys(global || []).forEach((i) => {
            envNunjucks.addGlobal(i, global[i]);
          });
        });
      }

      if (views.helpers && Array.isArray(views.helpers)) {
        views.helpers.forEach((helper) => {
          Object.keys(helper || []).forEach((i) => {
            envNunjucks.addGlobal(i, helper[i]);
          });
        });
      }

      if (views.filters && Array.isArray(views.filters)) {
        views.filters.forEach((filter) => {
          Object.keys(filter || []).forEach((i) => {
            envNunjucks.addFilter(i, filter[i]);
          });
        });
      }

      if (views.extensions && Array.isArray(views.extensions)) {
        views.extensions.forEach((extension) => {
          Object.keys(extension || []).forEach((i) => {
            envNunjucks.addExtension(i, extension[i]);
          });
        });
      }

      app.nunjucks = nunjucks;

      // ---------------
      // Middlewares
      // ---------------

      // Middleware File (compatibility)
      const middleware = app.config.middleware || ((req, res, next) => {
        next();
      });

      // Middleware Folder
      const middlewares = app.config.middlewares || {};

      Object.keys(middlewares).forEach( (item) => {
        const middlewareFunction = middlewares[item];
        if (typeof middlewareFunction === 'function') {
          vulkano.use(middlewareFunction);
        }
      });

      // ---------------
      // PUBLIC PATH - File: app/config/settings.js
      // ---------------
      vulkano.use(express.static(PUBLIC_PATH));

      // ---------------
      // ROUTES
      // ---------------

      const {
        routes
      } = app;

      let method;
      let pathToRoute;
      let handler;

      // Routes from convention (controller name & method = route)
      Object.keys(routes).forEach((route) => {

        const parts = route.split(' ');

        const [
          methodToRun,
          pathToRun
        ] = parts;

        method = methodToRun;

        if (pathToRun) {
          pathToRoute = pathToRun;
        }

        handler = routes[route];

        if (method === 'post') {
          vulkano[method](pathToRoute, upload.any(), middleware, handler);
        } else {
          vulkano[method](pathToRoute, middleware, handler);
        }

      });

      // Routes from config/routes.js
      Object.keys(this.routes || {}).forEach((i) => {

        const current = this.routes[i];
        const parts = i.split(' ');
        let pathToRun = parts.pop();

        // Capture the HTTP Method
        let option = (parts[0] !== undefined) ? String(parts[0]).toLowerCase() : 'get';

        if (option !== 'get' && option !== 'post' && option !== 'put' && option !== 'delete') {
          option = 'get';
        }

        if (!String(pathToRun).startsWith('/')) {
          pathToRun = `/${pathToRun}`;
        }

        let toExecute = null;

        if (typeof current === 'function') {

          toExecute = current;

        } else {

          const fullPath = this.routes[i].split('.');

          const [
            moduleToRun,
            controllerToRun,
            actionToRun
          ] = fullPath;

          let module;
          let controller;
          let action;

          if (actionToRun) { // Has folder
            module = moduleToRun;
            controller = controllerToRun;
            action = actionToRun;
          } else {
            module = null;
            controller = moduleToRun;
            action = controllerToRun;
          }

          try {
            toExecute = module
              ? (AllControllers[module][controller][action])
              : AllControllers[controller][action];
          } catch (e) {
            toExecute = null;
          }

          if (!toExecute) {
            console.error('\x1b[31mError:', 'Controller not found in', (module) ? `${module}.${controller}.${action}` : `${controller}.${action}`, '\x1b[0m');
          }

        }

        if (toExecute) {
          if (option === 'post') {
            vulkano[option](pathToRun || '/', upload.any(), middleware, toExecute);
          } else {
            vulkano[option](pathToRun || '/', middleware, toExecute);
          }
        }

      });

      const server = await vulkano.listen(expressConfig.port);

      // Routes registered
      const routesRegistered = vulkano._router.stack // registered routes
        .filter((r) => r.route && r.route.path !== '*') // take out all the middleware
        .map((r) => {
          return {
            method: Object.keys(r.route.methods)[0].toUpperCase(),
            path: r.route.path
          };
        });

      // ---------------
      // ERROR 404
      // ---------------
      vulkano.use((req, res) => {

        if (+res.statusCode >= 500 && +res.statusCode < 600) {
          throw new Error();
        }

        res.status(404);

        if (app.PRODUCTION) {
          res.render(`${views.path}/_shared/errors/404.html`);
          return;
        }

        // Verify if the error is a controller
        const isController = routesRegistered.filter( (r) => {

          const {
            path: routePath
          } = r || {};

          const routerControllerToCheck = Filter.get(req.path, 'trim', '/').split('/')[0];

          return routePath.startsWith(`/${routerControllerToCheck}`);

        });

        if (isController.length === 0) {

          res.render(`${CORE_PATH}/views/errors/no_controller.html`, {
            method: req.method,
            controller: req.path.split('/')[1]
          });

          return;

        }

        // Show the action name error
        res.render(`${CORE_PATH}/views/errors/no_action.html`, {
          method: req.method,
          controller: req.path.split('/')[1],
          action: req.path.split('/')[2]
        });

      });

      // ---------------
      // ERROR 5XX
      // ---------------
      vulkano.use((err, req, res, next) => {

        if (res.headersSent) {
          next(err);
          return;
        }

        const status = err ? (err.status || 500) : (res.statusCode || 500);

        res.status(status);

        // AJAX Response
        if (req.xhr) {

          res.jsonp({
            success: false,
            statusCode: status,
            error: {
              detail: err.message || err.error || err.invalidAttributes || err.toString() || 'Object Not Found',
              stack: (app.PRODUCTION) ? {} : (err.stack || {})
            }
          });

          return;

        }

        if (app.PRODUCTION) {

          if (+status > 400 && +status < 500) {
            res.render(`${vulkano.get('views')}/_shared/errors/404.html`);
          } else {
            res.render(`${vulkano.get('views')}/_shared/errors/500.html`);
          }

          return;

        }

        let errorViewToShow = `${CORE_PATH}/views/errors/exception.html`;

        if (err.stack.indexOf('template not found') >= 0) {
          errorViewToShow = `${CORE_PATH}/views/errors/no_view.html`;
        }

        res.render(errorViewToShow, {
          statusCode: status,
          method: req.method,
          controller: req.path.split('/')[1],
          action: req.path.split('/')[2],
          view: err.stack.indexOf('template not found') >= 0
            ? String( `${(err.stack.split('not found:')[1]).split('.')[0]}.html` ).trim()
            : '',
          stack: err.stack
        });

      });

      app.vulkano = vulkano;
      app.server = server;

      // ---------------
      // SOCKETS
      // ---------------
      const {
        sockets
      } = expressConfig || {};

      if (!sockets || (sockets && !sockets.enabled)) {
        cb();
        return;
      }

      const {
        config: socketsConfig,
        middlewares: socketsMiddlewares
      } = sockets;

      const socketProps = {
        ...(socketsConfig || {}),
        pingTimeout: +socketsConfig.timeout || 4000,
        pingInterval: +socketsConfig.interval || 2000,
        transports: socketsConfig.transports || ['websocket', 'polling']
      };

      if (sockets.cors) {
        if (typeof sockets.cors === 'function') {
          socketProps.allowRequest = sockets.cors;
        } else if (typeof sockets.cors === 'string') {
          socketProps.cors = sockets.cors || '';
        }
      }

      const {
        adapter
      } = sockets;

      const {
        redis: redisAdapter,
        mongodb: mongodbAdapter
      } = sockets.adapters || {};

      if ( String(adapter).toLocaleLowerCase() === 'redis') {

        const {
          host,
          port
        } = redisAdapter || {};

        if (!host || !port) {
          throw new Error('Unable to connect to Redis. File: "app/config/sockets/adapters/redis.js" to connect the sockets');
        }

        if (socketProps.transports.includes('polling')) {
          throw new Error('To enable Sockets with Redis support, the transports must be set ¨websocket¨ only');
        }

      } else if ( String(adapter).toLocaleLowerCase() === 'mongodb') {

        // if (socketProps.transports.includes('polling')) {
        // eslint-disable-next-line max-len
        //   console.log('To enable Sockets with MongoDB support the transports must be set to ["websocket"] only');
        // }

      }

      const io = new Server(server, socketProps);

      let pubClient = null;
      let subClient = null;

      if ( String(adapter).toLocaleLowerCase() === 'redis') {

        const propsToRedis = {
          host: redisAdapter.host,
          port: redisAdapter.port
        };

        if (redisAdapter.password) {
          propsToRedis.password = redisAdapter.password;
        }

        pubClient = socketRedis(propsToRedis);
        subClient = pubClient.duplicate();

        io.adapter(socketRedisAdapter(pubClient, subClient));

      } else if ( String(adapter).toLocaleLowerCase() === 'mongodb') {

        const {
          settings: socketsMongoSettings
        } = mongodbAdapter || {};

        const socketsConnection = String(process.env.SOCKETS_MONGO_URI || mongodbAdapter.connection || '').trim();
        let socketsDatabase = String(process.env.SOCKETS_MONGO_DATABASE || mongodbAdapter.database || '').trim();
        const socketsCollection = String(process.env.SOCKETS_MONGO_COLLECTION || mongodbAdapter.collection || 'socket.io-adapter-events').trim();

        let socketsMongoCollection = null;

        try {

          let mongoClientDB = null;

          // if not has a mongo conection try to create it
          if (!mongoose.connection.readyState) {

            if (!socketsConnection) {
              throw new Error('Unable to connecto to the database for SocketIO. Please check the env var SOCKETS_MONGO_URI and try again.');
            }

            const socketMongooseConnection = await socketMongoose.connect(socketsConnection);
            mongoClientDB = socketMongooseConnection.connection.getClient();

          } else {

            // Get current connection
            mongoClientDB = mongoose.connection.getClient();
            socketsDatabase = mongoose.connection.db.s.namespace.db;

            // SOCKETS_MONGO_URI
            if (socketsConnection && ( socketsConnection !== mongoClientDB.s.url )) {

              const socketMongoInstance = new socketMongoose.Mongoose();

              const socketMongooseConnection = await socketMongoInstance.connect(socketsConnection);
              mongoClientDB = socketMongooseConnection.connection.getClient();
              socketsDatabase = socketMongoInstance.connection.db.s.namespace.db;

            }

          }

          socketsMongoCollection = mongoClientDB.db(socketsDatabase).collection(socketsCollection);

          const propsToMongoCollection = {
            expireAfterSeconds: 3600,
            background: true,
            ...(socketsMongoSettings || {})
          };

          socketsMongoCollection.createIndex({ createdAt: 1 }, propsToMongoCollection);

        } catch (err) {
          console.log(err);
          throw new Error('To enable Sockets with MongoDB support. Check the connection.');
        }

        io.adapter(socketMongoAdapter(socketsMongoCollection, { addCreatedAtField: true }));

      }

      Promise
        .all([
          (pubClient ? pubClient.connect() : null),
          (subClient ? subClient.connect() : null)
        ])
        .then(() => {

          io.on('connection', (socket) => {

            if ( typeof sockets.onConnect === 'function') {
              sockets.onConnect(socket);
            }

            const socketEvents = sockets.events || sockets.routes || {};

            Object.keys(socketEvents).forEach( (i) => {

              const checkPath = socketEvents[i] || '';

              let toExecute = null;
              let module = null;
              let controller = null;
              let action = null;

              if (typeof checkPath === 'function') {

                toExecute = checkPath;

              } else {

                const fullPath = checkPath.split('.');

                if (fullPath.length > 2) { // Has folder

                  [
                    module,
                    controller,
                    action
                  ] = fullPath;

                } else {

                  [
                    controller,
                    action
                  ] = fullPath;

                }

                try {
                  toExecute = module
                    ? (AllControllers[module][controller][action])
                    : AllControllers[controller][action];
                } catch (e) {
                  toExecute = null;
                }

              }

              if (toExecute) {
                socket.on(i, (body, callback) => {
                  toExecute({ socket, body: body || {} }, callback || (() => {}));
                });
              } else {
                console.error('\x1b[31mError:', 'Controller not found in', (module) ? `${module}.${controller}.${action}` : `${controller}.${action}`, '\x1b[0m', 'to socket event', i);
              }

            });

            vulkano.set('socket', socket);
            app.socket = socket;

          });

          // next line is the money
          global.io = io;
          vulkano.set('socketio', io);

          // middleware
          if (sockets.middleware && typeof sockets.middleware === 'function') {
            io.use(sockets.middleware);
          }

          Object.keys(socketsMiddlewares || {}).forEach( (item) => {
            const middlewareFunction = socketsMiddlewares[item];
            if (typeof middlewareFunction === 'function') {
              io.use(middlewareFunction);
            }
          });

          // override vulkano
          app.vulkano = vulkano;

          cb();

        });

    }

  };

};
