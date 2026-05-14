const path = require('path');

global.ABS_PATH = __dirname;
global.APP_PATH = path.join(__dirname, 'app');
global.PUBLIC_PATH = path.join(__dirname, 'public');

const startVulkano = require('../../app.js');
startVulkano();
