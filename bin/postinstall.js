#!/usr/bin/env node

/**
 * Vulkano scaffold — runs after `npm install @vulkano/core`.
 *
 * If the project does not already have an `app/` or `vulkano/` directory,
 * creates the minimal folder structure and config files needed to start.
 */

const fs = require('fs');
const path = require('path');

// npm sets INIT_CWD to the directory where `npm install` was invoked.
// npm_config_local_prefix is the project root (directory containing node_modules).
// Fall back to __dirname-based resolution for non-npm invocations.
const coreRoot = path.resolve(__dirname, '..');
const projectRoot = process.env.INIT_CWD
  || process.env.npm_config_local_prefix
  || path.resolve(__dirname, '..', '..', '..', '..');

if (projectRoot === coreRoot) {
  // Running `npm install` inside the core repo itself — nothing to scaffold
  process.exit(0);
}

const appDir    = path.join(projectRoot, 'app');
const vulkanoDir = path.join(projectRoot, 'vulkano');

if (fs.existsSync(appDir) || fs.existsSync(vulkanoDir)) {
  // Project already has a structure — do not touch it
  process.exit(0);
}

// ─────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────

const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('\n  🌋 Vulkano: Would you like to scaffold a new project? (Y/n) ', (answer) => {

  rl.close();

  if (answer.trim().toLowerCase() === 'n') {
    console.log('\n  Skipped. You can scaffold manually at any time.\n');
    process.exit(0);
  }

  scaffold();

});

// ─────────────────────────────────────────────
// Scaffold
// ─────────────────────────────────────────────

function scaffold() {

function write(relPath, content) {
  const abs = path.join(appDir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(abs, content, 'utf8');
  }
}

function dir(relPath) {
  const abs = path.join(appDir, relPath);
  fs.mkdirSync(abs, { recursive: true });
  const keep = path.join(abs, '.gitkeep');
  if (!fs.existsSync(keep)) fs.writeFileSync(keep, '', 'utf8');
}

// ─────────────────────────────────────────────
// app/config/bootstrap.js  (required by Vulkano)
// ─────────────────────────────────────────────
write('config/bootstrap.js', `/**
 * Bootstrap — called once the server is ready to start.
 * @param {Function} cb  Call cb() to finish startup
 */
module.exports = (cb) => {

  // Start app
  cb(() => {

  });
};
`);

// ─────────────────────────────────────────────
// app/config/settings.js
// ─────────────────────────────────────────────
write('config/settings.js', `/**
 * Application settings
 */
module.exports = {

  // Server port (overridden by NODE_PORT / PORT env vars)
  port: parseInt(process.env.PORT, 10) || 8000,

  // Database connection — key must exist in app/config/connections.js
  database: {
    connection: 'default',
    settings: {
      strictQuery: false,
      debug: false
    }
  }

};
`);

// ─────────────────────────────────────────────
// app/config/connections.js
// ─────────────────────────────────────────────
write('config/connections.js', `/**
 * Database connections
 * The key here is referenced from settings.js → database.connection
 */
module.exports = {

  default: process.env.MONGO_URI || 'mongodb://localhost:27017/vulkano'

};
`);

// ─────────────────────────────────────────────
// app/config/routes.js
// ─────────────────────────────────────────────
write('config/routes.js', `/**
 * Explicit routes (optional)
 * Format: 'METHOD /path': 'ControllerName.action'
 *
 * Convention-based routes are auto-generated from controllers — no need
 * to list them here.
 *
 * Example:
 * - GET /users/ -> File: UsersController, Method: 'get': (req, res) => {}
 * - GET /users/123 -> File: UsersController, Method: 'get :id': (req, res) => {}
 * - POST /users/ -> File: UsersController, Method: 'post': (req, res) => {}
 * - PUT /users/123 -> File: UsersController, Method: 'put :id': (req, res) => {}
 * - DELETE /users/123 -> File: UsersController, Method: 'delete :id': (req, res) => {}
 *
 * But you can write your own routes manually
 *
 */
module.exports = {

  // 'GET /': 'HomeController.get'

};
`);

// ─────────────────────────────────────────────
// app/config/express/settings.js
// ─────────────────────────────────────────────
write('config/express/settings.js', `/**
 * Express server settings
 */
module.exports = {

  // Show "X-Powered-By" header
  poweredBy: false,

  // Request timeout in milliseconds
  timeout: 120000,

  // Folder to upload files
  uploadPath: 'public/files',

  // Number of proxy hops to trust for X-Forwarded-* headers.
  // Use 1 when behind a single load balancer, true to trust all (less secure).
  trustProxy: 1

};
`);

// ─────────────────────────────────────────────
// app/config/express/cors.js
// ─────────────────────────────────────────────
write('config/express/cors.js', `/**
 * CORS configuration
 */
module.exports = {

  // Enable CORS
  enabled: false,

  // Path where CORS headers are applied
  path: '/',

  // Allowed origin — use specific domains in production
  origin: '*',

  // Additional allowed request headers
  headers: ['x-token-auth']

};
`);

// ─────────────────────────────────────────────
// app/config/express/jwt.js
// ─────────────────────────────────────────────
write('config/express/jwt.js', `/**
 * JWT authentication middleware
 */
module.exports = {

  //
  // Enable JWT
  // @type Boolean
  //
  enabled: false,

  //
  // Custom KEY
  // You can use this https://api.wordpress.org/secret-key/1.1/salt/ to change key
  // @type String
  //
  key: process.env.JWT_SECRET_KEY || '',

  //
  // header name via Request
  // @type String
  //
  header: 'x-token-auth',

  //
  // Get token via url
  // value: string
  // @type String
  //
  queryParameter: 'token',

  //
  // Get token via cookie
  // value: string
  // @type String
  //
  cookieName: 'token',

  //
  // Path to make mandatory the token
  // Example /api/
  // @type String
  //
  path: '/api/',

  //
  // Path to ignore token request
  // Example: ['/api/auth', '/api/auth/forgot', /^\\/api\\/events/i]
  // you can see https://github.com/jfromaniello/express-unless to more examples
  //
  // To allow the enpoint to verify token replace the api path for /^\\/api\\/auth(?!\\/current)/i
  //
  // @type Array
  //
  ignore: [
    '/api/',
    /^\\/api\\/auth(?!\\/current)/i
  ]

};
`);

// ─────────────────────────────────────────────
// app/config/express/cookies.js
// ─────────────────────────────────────────────
write('config/express/cookies.js', `/**
 * Cookie parser
 */
module.exports = {

  //
  // Enable Cookies
  // @type Boolean
  //
  enabled: false,

  // SECRET KEY to sign the cookie
  // You can use this https://api.wordpress.org/secret-key/1.1/salt/ to change key
  // @type String
  secret: process.env.COOKIES_SECRET_KEY || ''

};
`);

// ─────────────────────────────────────────────
// app/config/encryption.js
// ─────────────────────────────────────────────
write('config/encryption.js', `/**
 * Encryption settings (used by Encrypter)
 */
module.exports = {

  // Secret encryption key — always set via environment variable
  key: process.env.ENCRYPTION_KEY || '',

  // Salt for key derivation (scrypt)
  salt: process.env.ENCRYPTION_SALT || 'vulkano-salt-v1',

  // Cipher algorithm
  algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc'

};
`);

// ─────────────────────────────────────────────
// app/controllers/HomeController.js
// ─────────────────────────────────────────────
write('controllers/HomeController.js', `/**
 * HomeController
 * Convention-based routes → GET /home/, GET /home/:id, POST /home/save, etc.
 *
 * To map GET / to this controller add to app/config/routes.js:
 *   'GET /': 'HomeController.index'
 */
module.exports = {

  // GET /home/
  get(req, res) {
    res.render('home/index.html');
  }

};
`);

// ─────────────────────────────────────────────
// Empty placeholder directories
// ─────────────────────────────────────────────
dir('models');
dir('services');
dir('responses');

// ─────────────────────────────────────────────
// app/views structure
// ─────────────────────────────────────────────
dir('views/home');
dir('views/_shared/errors');
dir('views/_shared/templates');

write('views/_shared/templates/default.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{% block title %}Vulkano{% endblock %}</title>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>

  {% block content %}{% endblock %}

  <script src="/js/app.js"></script>
</body>
</html>
`);

write('views/home/index.html', `{% extends "_shared/templates/default.html" %}

{% block title %}Home — Vulkano{% endblock %}

{% block content %}
  <h1>Vulkano is running!</h1>
{% endblock %}
`);

write('views/_shared/errors/404.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 Not Found</title>
</head>
<body>
  <h1>404 — Page Not Found</h1>
</body>
</html>
`);

write('views/_shared/errors/500.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>500 Server Error</title>
</head>
<body>
  <h1>500 — Server Error</h1>
</body>
</html>
`);

// public/files for multer uploads
const publicFiles = path.join(projectRoot, 'public', 'files');
fs.mkdirSync(publicFiles, { recursive: true });

// public/css for css files
const publicCss = path.join(projectRoot, 'public', 'css');
fs.mkdirSync(publicCss, { recursive: true });

// public/js for js files
const publicJs = path.join(projectRoot, 'public', 'js');
fs.mkdirSync(publicJs, { recursive: true });

// public/img for image files
const publicImg = path.join(projectRoot, 'public', 'img');
fs.mkdirSync(publicImg, { recursive: true });

// public/fonts for font files
const publicFonts = path.join(projectRoot, 'public', 'fonts');
fs.mkdirSync(publicFonts, { recursive: true });

// .env example
const envExample = path.join(projectRoot, '.env');
if (!fs.existsSync(envExample)) {
  fs.writeFileSync(envExample, [
    '# Copy to .env and fill in your values',
    'PORT=8000',
    'MONGO_URI=',
    'JWT_SECRET=',
    'COOKIE_SECRET=',
    'ENCRYPTION_KEY=',
    'ENCRYPTION_SALT=salt',
    'ENCRYPTION_ALGORITHM=aes-256-cbc',
    ''
  ].join('\n'), 'utf8');
}

console.log([
  '',
  '  ✔  Vulkano scaffold created:',
  '     app/config/         ← settings, connections, routes, express, jwt…',
  '     app/controllers/    ← HomeController.js',
  '     app/models/         ← (empty — add your models here)',
  '     app/services/       ← (empty — add your services here)',
  '     app/views/          ← home/index.html, _shared/templates/default.html, errors/404, 500',
  '     public/css/         ← css files',
  '     public/js/          ← js files',
  '     public/img/         ← image files',
  '     public/fonts/       ← font files',
  '     .env                ← fill in values',
  '',
  '  Next steps:',
  '     1. Set MONGO_URI, JWT_SECRET, etc.',
  '',
].join('\n'));

} // end scaffold()