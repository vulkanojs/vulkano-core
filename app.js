/* eslint-disable import/no-dynamic-require */

/**
 * Bootstrap.js
 *
 */

// Start Time for logs
global.START_TIME = new Date();

const dotenv = require('dotenv');
const path = require('path');
const moment = require('moment');
const merge = require('deepmerge');
const _ = require('underscore');
const Promise = require('bluebird');
const v8 = require('v8');
const fs = require('fs');

global.app = {};
global._ = _;
global.Promise = Promise;

const rootProject = path.resolve(process.cwd());

// Set the ABS_PATH
if (!global.ABS_PATH) {
  global.ABS_PATH = path.resolve(rootProject, './');
}

// Set the APP_PATH
if (!global.APP_PATH) {
  global.APP_PATH = path.resolve(rootProject, './app');
  if (!fs.existsSync(APP_PATH)) {
    global.APP_PATH = path.resolve(rootProject, './vulkano');
    if (!fs.existsSync(APP_PATH)) {
      global.APP_PATH = path.resolve(rootProject, './');
    }
  }
}

if (!fs.existsSync(APP_PATH)) {
  console.log('the global var APP_PATH or the vulkano directory not found', APP_PATH);
  global.APP_PATH = path.resolve(__dirname, './');
}

if (!global.PUBLIC_PATH) {
  global.PUBLIC_PATH = path.resolve(rootProject, './public');
  if (!fs.existsSync(PUBLIC_PATH)) {
    global.PUBLIC_PATH = path.resolve(rootProject, './');
  }
}

global.CORE_PATH = __dirname;

if (!fs.existsSync(APP_PATH)) {
  console.log('the global var APP_PATH or directory not found', APP_PATH);
  global.APP_PATH = path.resolve(__dirname, './');
}

if (!fs.existsSync(PUBLIC_PATH)) {
  console.log('the global var PUBLIC_PATH or directory not found', PUBLIC_PATH);
  global.PUBLIC_PATH = path.resolve(__dirname, './');
}

// Read Dontenv config
dotenv.config({ path: `${ABS_PATH}/.env` });

// Include all api config
const config = require('include-all')({
  dirname: `${APP_PATH}/config`,
  filter: /(.+)\.js$/,
  optional: true
});

//
// Get package.json information
//
const pkg = require(`${CORE_PATH}/package.json`);
const appPkg = require(`${ABS_PATH}/package.json`);

// Environment
const NODE_ENV = (process.env.NODE_ENV || 'development').toLowerCase();

app.PRODUCTION = NODE_ENV === 'production' ? true : false;

const {
  views,
  local,
  env
} = config || {};

// NODE_ENV
const environmentConfig = env ? env[NODE_ENV] || {} : {};

// Merge Settings
const settings = {
  ...config.settings,
  views: views?.config || ''
};

// All config merged (default, NODE_ENV (folder env), local.js file)
const allConfig = merge.all([
  // General Config
  config || {},

  // Settings Config
  { settings },

  // Environment Config
  environmentConfig,

  // Local Config
  local || {}
]);

delete allConfig.env;
delete allConfig.local;

// General Settings
app.config = allConfig;

// Package Config
app.pkg = appPkg;

// Include all components
require('./bootstrap/services')();
require('./database/mongodb')();

const controllers = require('./controllers/controllers')();
const server = require('./bootstrap/server');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    crimson: '\x1b[38m' // Scarlet
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
    crimson: '\x1b[48m'
  }
};

function startVulkano() {

  const appName = appPkg.name.toUpperCase().split('-').join(' ');
  const appVersion = appPkg.version;
  const author = appPkg.author || pkg.author;

  const lineWidth = 38;

  const showCenteredText = (text) => {

    const colSize = (lineWidth / 2) - 3;
    const textLength = (text || '').length;
    const textLeftSize = Math.trunc(textLength / 2);
    const textRightSize = textLength - textLeftSize;

    const textPaddingLeft = ''.padStart( colSize - textLeftSize, ' ');
    const textPaddingRight = ''.padEnd( colSize - textRightSize, ' ');
    const textCentered = `${textPaddingLeft}${text}${textPaddingRight}`;

    return textCentered;

  };

  const cutLine = '-'.padEnd(lineWidth, '-');

  console.log('');
  console.log(`${colors.fg.magenta}${cutLine}`, colors.reset);
  console.log('');
  console.log(colors.fg.cyan, showCenteredText('🌋'), colors.reset);
  console.log(colors.fg.cyan, showCenteredText(`${appName} ${appVersion}`), colors.reset);
  console.log(colors.fg.cyan, showCenteredText(`${pkg.name} ${pkg.version}`.toUpperCase()), colors.reset);
  console.log('');
  console.log(colors.fg.blue, '🔗 github.com/vulkanojs/vulkano', colors.reset);
  console.log(colors.fg.cyan, '☕ buymeacoffee.com/argordmel', colors.reset);
  console.log('');
  console.log(` Author: ${colors.fg.green}${author}${colors.reset}`);
  console.log(`${colors.fg.magenta}${cutLine}`, colors.reset);

  // Routes
  app.routes = controllers;

  // Server Config
  app.server = {
    ...server,
    ...app.config.settings
  };

  // Server Routes
  app.server.routes = {
    ...app.config.routes
  };

  const {
    bootstrap
  } = config;

  if (!bootstrap || typeof bootstrap !== 'function') {
    console.log('Missing the boostrap file to start app: app/config/bootstrap.js');
    return;
  }

  bootstrap( (callbackAfterInitVulkano) => {

    // Start Express
    app.server.start( () => {

      const {
        sockets,
        settings: configSettings,
        redis
      } = app.config || {};

      const {
        database
      } = configSettings || {};

      const {
        connection
      } = database || {};

      const showColumn = (text, titleLength) => {
        const txt = `${text.padEnd( 16 - titleLength, ' ')}`;
        return txt;
      };

      const connectionToShow = connection && process.env.MONGO_URI ? 'MONGO_URI' : connection;

      const serverConfig = [];

      const nodeVersion = process.version.match(/^v(\d+\.\d+\.\d+)/)[1];
      const portText = String(app.vulkano.get('port') || 8000);
      const socketText = sockets.enabled ? 'YES' : 'NO';
      const redisText = redis && redis.enabled ? 'YES' : 'NO';

      serverConfig.push(` PORT: ${colors.fg.green}${showColumn(portText, 7)}${colors.reset}`);
      serverConfig.push(' | ');
      serverConfig.push(` ENV: ${app.PRODUCTION ? colors.fg.red : colors.fg.green}${showColumn(NODE_ENV, 0)}${colors.reset}`);

      console.log(serverConfig.join(''));

      const totalHeapSize = v8.getHeapStatistics().total_available_size;
      const totalHeapSizeGb = (totalHeapSize / 1024 / 1024 / 1024).toFixed(2);

      const nodeConfig = [];
      nodeConfig.push(` NODE: ${colors.fg.green}${showColumn(nodeVersion, 7)}${colors.reset}`);
      nodeConfig.push(' | ');
      nodeConfig.push(' MAX MEM: ', `${colors.fg.green}${totalHeapSizeGb} GB${colors.reset}`);
      console.log(nodeConfig.join(''));

      const startUpConfig = [];
      startUpConfig.push(' SOCKETS: ', `${colors.fg.green}${showColumn(socketText, 10)}${colors.reset}`);
      startUpConfig.push(' | ');
      startUpConfig.push(` STARTUP: ${colors.fg.green}${moment(moment().diff(global.START_TIME)).format('s.SSS')}s${colors.reset}`);
      console.log(startUpConfig.join(''));

      const dbConfig = [];
      dbConfig.push(' REDIS: ', `${colors.fg.green}${showColumn(redisText, 8)}${colors.reset}`);
      dbConfig.push(' | ');
      dbConfig.push(' DB: ', connection ? `${colors.fg.green}${connectionToShow}${colors.reset}` : `${colors.fg.blue}NO DATABASE${colors.reset}`);
      console.log(dbConfig.join(''));

      console.log(`${colors.fg.magenta}${cutLine}`, colors.reset);

      // Run custom callback after init vulkano
      if (callbackAfterInitVulkano && typeof callbackAfterInitVulkano === 'function') {
        callbackAfterInitVulkano();
      }

    });

  });

}

module.exports = startVulkano;
