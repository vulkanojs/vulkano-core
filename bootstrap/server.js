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
const merge = require('deepmerge');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

// Include all api controllers
const AllControllers = require('include-all')({
  dirname: `${APP_PATH}/controllers`,
  filter: /(.+Controller)\.js$/,
  optional: true
});

const viewsConfig = require('./views');

const responses = require('./responses');

const JWT = require('../libs/Jwt');

module.exports = {

  routes: {},

  start: function loadServerApplication(cb) {

    const jwtMiddleware = JWT;

    // Common config by filename
    const {
      cors,
      jwt,
      settings,
      sockets,
      cookies,
      redis,
      // Folder express config files
      express: expressServerConfig
    } = app.config || {};

    // express config by file in settings.js
    const {
      port: expressUserPort,
      express: expressConfigInSettings
    } = settings || {};

    // express config by file in app/config/express/settings.js
    const {
      settings: expressGeneralSettings
    } = expressServerConfig || {};

    // express port via file in app/config/express/settings.js
    const {
      port: expressSettingsPort
    } = expressGeneralSettings || {};

    const {
      NODE_PORT: ENV_NODE_PORT,
      PORT: ENV_PORT
    } = process.env || {};

    // Express default configuration
    const expressDefaultConfig = {
      timeout: 120000,
      poweredBy: false,
      port: ENV_NODE_PORT || ENV_PORT || expressUserPort || expressSettingsPort || 8000,
      cors: {},
      cookies: {},
      jwt: {},
      multer: {
        dest: 'public/files'
      },
      morgan: {
        format: 'dev',
        skip: ((req, res) => res.statusCode < 400)
      },
      compression: {},
      json: {},
      urlencoded: {
        extended: true
      },
      helmet: {
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
      },
      frameguard: null
    };

    // Merge all express configuration: config/file.js, config/express/file.js, config/settings.js
    const expressConfig = merge.all([
      {
        cookies,
        jwt,
        cors
      },
      expressDefaultConfig || {},
      expressServerConfig || {},
      expressGeneralSettings || {},
      expressConfigInSettings || {},
    ]);

    if (expressConfig && expressConfig.settings) {
      delete expressConfig.settings;
    }

    const server = express();

    // Settings
    server.enable('trust proxy');

    // ---------------
    // PORT - File: app/config/express/settings.js
    // ---------------
    server.set('port', expressConfig.port);

    // ---------------
    // MULTER - File: app/config/express/multer.js
    // ---------------
    const upload = multer(expressConfig.multer);

    // ---------------
    // MORGAN - File: app/config/express/morgan.js
    // ---------------
    server.use(morgan(expressConfig.morgan.format, expressConfig.morgan));

    // ---------------
    // USER AGENT
    // ---------------
    server.use(useragent.express());

    // ---------------
    // COMPRESSION - File: app/config/express/compression.js
    // ---------------
    server.use(compression( expressConfig.compression || {} ));

    // ---------------
    // COOKIES - File: app/config/express/cookies.js
    // ---------------
    if (expressConfig.cookies && expressConfig.cookies.enabled) {
      const cookiesSecretKey = process.env.COOKIES_SECRET_KEY || expressConfig.cookies.key || expressConfig.cookies.secret || '';
      if (!cookiesSecretKey) {
        console.log(' \x1b[33mWARNING\x1b[0m: Set the secret key in the config/express/cookie.js file or COOKIES_SECRET_KEY in the .env file.');
      }
      server.use(cookieParser(cookiesSecretKey));
    }

    // ---------------
    // EXPRESS JSON - File: app/config/express/json.js
    // ---------------
    server.use(express.json(expressConfig.json));

    // ---------------
    // EXPRESS FORM DATA - File: app/config/express/urlencoded.js
    // ---------------
    server.use(express.urlencoded(expressConfig.urlencoded));

    // ---------------
    // HELMET - File: app/config/express/helmet.js
    // ---------------
    server.use(helmet(expressConfig.helmet));

    // ---------------
    // RESPONSES
    // ---------------
    server.use(responses);

    // ---------------
    // PUBLIC PATH - File: app/config/settings.js
    // ---------------
    server.use(express.static(PUBLIC_PATH));

    // ---------------
    // FRAMEGUARD - File: app/config/express/frameguard.js
    // ---------------
    if (expressConfig.frameguard) {
      if (Array.isArray(expressConfig.frameguard)) {
        expressConfig.frameguard.forEach( (frame) => {
          server.use(frameguard(frame));
        });
      } else {
        server.use(frameguard(expressConfig.frameguard));
      }
    }

    // ---------------
    // PROTOCOL & POWERED BY - File: app/config/settings.js
    // ---------------
    server.use( (req, res, next) => {

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
    server.options('*', (req, res) => {

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
    server.use(timeout( expressConfig.timeout || 120000 ));
    server.use( (req, res, next) => {
      if (!req.timedout) {
        next();
      }
    });

    // ---------------
    // JWT - File: app/config/express/jwt.js
    // ---------------
    if (expressConfig.jwt && expressConfig.jwt.enabled) {

      const jwtSecretKey = process.env.JWT_SECRET_KEY || expressConfig.jwt.key || expressConfig.jwt.secret || '';
      if (!jwtSecretKey) {
        console.log(' \x1b[41mERROR\x1b[0m: Can not get key in config/express/jwt.js file or JWT_SECRET_KEY in .env file');
        return;
      }

      // JWT (secret key)
      server.use(expressConfig.jwt.path || '*', jwtMiddleware.init().unless({
        path: expressConfig.jwt.ignore || []
      }));

      // JWT  Handler error
      server.use((err, req, res, next) => {
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

      server.use(expressConfig.cors.path, (req, res, next) => {

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
    // VIEWS
    // ---------------

    const views = {
      ...viewsConfig,
      ...(app.server.views || {})
    };

    server.set('views', views.path);

    const {
      settings: nunjucksSettingsUser
    } = views || {};

    const nunjucksSettings = {
      autoescape: true,
      watch: !app.PRODUCTION,
      ...(nunjucksSettingsUser || {}),
      express: server
    };

    const envNunjucks = nunjucks.configure(views.path, nunjucksSettings);

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

    // Middleware
    const middleware = app.config.middleware || ((req, res, next) => {
      next();
    });

    // Middleware Folder
    const middlewares = app.config.middlewares || {};

    Object.keys(middlewares).forEach( (item) => {
      const middlewareFunction = middlewares[item];
      if (typeof middlewareFunction === 'function') {
        server.use(middlewareFunction);
      }
    });

    // ---------------
    // ROUTES
    // ---------------

    const {
      routes
    } = app;

    let method;
    let pathToRoute;
    let handler;

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
        server[method](pathToRoute, upload.any(), middleware, handler);
      } else {
        server[method](pathToRoute, middleware, handler);
      }

    });

    Object.keys(this.routes || {}).forEach((i) => {

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

      const parts = i.split(' ');
      const pathToRun = parts.pop();
      let option = (parts[0] !== undefined) ? parts[0].toLowerCase() : 'get';
      if (option !== 'get' && option !== 'post' && option !== 'put' && option !== 'delete') {
        option = 'get';
      }

      let toExecute = null;

      try {
        toExecute = module
          ? (AllControllers[module][controller][action])
          : AllControllers[controller][action];
      } catch (e) {
        toExecute = null;
      }

      if (toExecute) {
        if (option === 'post') {
          server[option](pathToRun || '/', upload.any(), middleware, toExecute);
        } else {
          server[option](pathToRun || '/', middleware, toExecute);
        }
      } else {
        console.error('\x1b[31mError:', 'Controller not found in', (module) ? `${module}.${controller}.${action}` : `${controller}.${action}`, '\x1b[0m');
      }

    });

    // ---------------
    // ERROR 404
    // ---------------
    server.use((req, res) => {
      if (+res.statusCode >= 500 && +res.statusCode < 600) {
        throw new Error();
      }
      res.status(404).render(`${views.path}/_shared/errors/404.html`);
    });

    // ---------------
    // ERROR 5XX
    // ---------------
    server.use((err, req, res) => {
      const status = err.status || res.statusCode || 500;
      res.status(status);
      if (!res.xhr) {
        if (+status > 400 && +status < 500) {
          res.render(`${server.get('views')}/_shared/errors/404.html`, { content: err.stack });
        } else {
          res.render(`${server.get('views')}/_shared/errors/500.html`, { content: err.stack });
        }
      } else {
        res.jsonp({
          success: false,
          error: err.message || err.error || err.invalidAttributes || err.toString() || 'Object Not Found',
          data: (app.PRODUCTION) ? {} : (err.stack || {})
        });
      }
    });

    // ---------------
    // SOCKETS
    // ---------------
    if (sockets.enabled) {

      const socketProps = {
        pingTimeout: +sockets.timeout || 4000,
        pingInterval: +sockets.interval || 2000,
        transports: sockets.transports || ['websocket', 'polling']
      };

      if (sockets.cors) {
        if (typeof sockets.cors === 'function') {
          socketProps.allowRequest = sockets.cors;
        } else if (typeof sockets.cors === 'string') {
          socketProps.cors = sockets.cors || '';
        }
      }

      if (sockets.redis && !redis.enabled) {
        throw new Error('Enable the Redis config "app/config/redis.js" to connect the sockets');
      }

      const io = new Server(server.listen(expressConfig.port), socketProps);

      let pubClient = null;
      let subClient = null;

      if (sockets.redis) {

        const propsToRedis = {
          host: redis.host,
          port: redis.port
        };

        if (redis.password) {
          propsToRedis.password = redis.password;
        }

        pubClient = createClient(propsToRedis);
        subClient = pubClient.duplicate();

        io.adapter(createAdapter(pubClient, subClient));

      }

      Promise
        .all([
          (sockets.redis ? pubClient.connect() : null),
          (sockets.redis ? subClient.connect() : null)
        ])
        .then(() => {

          io.on('connection', (socket) => {

            if ( typeof sockets.onConnect === 'function') {
              sockets.onConnect(socket);
            }

            const socketEvents = sockets.events || {};

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
                socket.on(i, (body) => {
                  toExecute({ socket, body: body || {} });
                });
              } else {
                console.error('\x1b[31mError:', 'Controller not found in', (module) ? `${module}.${controller}.${action}` : `${controller}.${action}`, '\x1b[0m', 'to socket event', i);
              }

            });

            server.set('socket', socket);
            app.socket = socket;

          });

          // next line is the money
          global.io = io;
          server.set('socketio', io);

          // middleware
          if (sockets.middleware) {
            io.use(sockets.middleware);
          }

          app.server = server;

          cb();

        });

      return;

    }

    // ---------------
    // START SERVER
    // ---------------
    server.listen(server.get('port'), () => {
      app.server = {
        ...app.server,
        ...server
      };
      cb();
    });

  }

};
