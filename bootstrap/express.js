const merge = require('deepmerge');

module.exports = function getExpressConfiguration() {

  // Common config by filename
  const {
    cors,
    jwt,
    settings,
    sockets: rawSockets,
    cookies,
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
    sockets: {},
    redis: {},
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

  // --------
  // Sockets
  // --------

  // Default config
  const defaultConfig = {
    enabled: false,
    adapter: 'memory',
    adapters: {
      mongodb: {
        enabled: false
      },
      redis: {
        enabled: false
      }
    }
  };

  // Check Sockets configuration config/sockets/config.js
  const {
    config: socketsConfig
  } = rawSockets || {};

  // Merge config
  const sockets = {
    ...(defaultConfig || {}),
    ...(socketsConfig || {}),
    ...(rawSockets || {}),
    config: {
      ...( socketsConfig ? (socketsConfig.config || {}) : {})
    }
  };

  // Set the new values
  app.config.sockets = { ...sockets };

  // Merge all express configuration: config/file.js, config/express/file.js, config/settings.js
  const expressConfig = merge.all([
    {
      cookies,
      jwt,
      cors,
      sockets
    },
    expressDefaultConfig || {},
    expressServerConfig || {},
    expressGeneralSettings || {},
    expressConfigInSettings || {},
  ]);

  if (expressConfig && expressConfig.settings) {
    delete expressConfig.settings;
  }

  return expressConfig;

};
