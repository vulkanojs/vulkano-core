<p align="center">
  <img src="https://avatars.githubusercontent.com/u/42077334?s=200&v=4" alt="Vulkano Logo" width="100">
</p>

<h1 align="center">@vulkano/core</h1>

<p align="center">
  A fast, convention-based MVC framework for Node.js — built on top of Express.
</p>

<p align="center">
  <a href="https://opencollective.com/vulkanojs#backer"><img src="https://opencollective.com/vulkanojs/backers/badge.svg" alt="Backers"></a>
  <a href="https://opencollective.com/vulkanojs#sponsor"><img src="https://opencollective.com/vulkanojs/sponsors/badge.svg" alt="Sponsors"></a>
</p>

---

## What is Vulkano?

Vulkano is a lightweight MVC framework for building web applications and APIs with Node.js. It wires together Express, MongoDB (Mongoose), Socket.io, i18n, JWT, file uploads, cron jobs, and more — so you spend time writing features, not boilerplate.

Inspired by [KumbiaPHP](https://www.kumbiaphp.com).

For the full project generator/scaffolding (frontend + backend structure), see the framework: [https://github.com/vulkanojs/vulkano](https://github.com/vulkanojs/vulkano)

---

## Requirements

- **Node.js** `^22`
- **MongoDB** (optional — only needed if you use models)
- **Redis** (optional — only needed for Socket.io Redis adapter or sessions)

---

## Installation

```bash
npm install @vulkano/core
```

---

## Environment variables

```
PORT=8000
MONGO_URI=mongodb://localhost:27017/myapp
SALT_KEY=random-string
JWT_SECRET=supersecret
```

## Quick Start

### 1. Entry point — `app.js`

```js
const vulkano = require('@vulkano/core');
vulkano();
```

### 2. Project structure

```
your-app/
├── app.js                  # Entry point
├── app/                    # Your application
│   ├── config/
│   │   ├── settings.js     # App-wide settings (port, database, JWT…)
│   │   ├── routes.js       # Explicit route overrides (optional)
│   │   ├── env/            # Per-environment config overrides
│   │   ├── express/        # Express middleware customization
│   │   ├── settings.js     # App-wide settings (port, database, JWT…)
│   │   ├── routes.js       # Explicit route overrides (optional)
│   │   └── locales/        # i18n translation files (en.js, es.js, etc.)
│   ├── controllers/        # Request handlers
│   ├── models/             # Mongoose model definitions
│   └── services/           # Shared services & libs (auto-loaded as globals)
└── public/                 # Static files served over HTTP
│   ├── css/
│   ├── js/
│   ├── img/
│   └── files/              # Uploaded files
```

---

## Routing

Vulkano resolves routes **by convention** — no route file required for standard CRUD.

The URL segments map to `/:resource/:method?/:param?`, resolving to `<Resource>Controller.<method>(param)`.
The **resource segment is always the requesting controller's own filename** (`UsersController` → `users`).

```
GET /users/edit/1
     │     │    │
     │     │    └── param  → passed as the method argument
     │     └─────── method → UsersController.edit
     └───────────-─ resource ("users") → UsersController
```

### Convention-based (automatic)

| HTTP method | URL               | Resolves to                          |
|-------------|-------------------|--------------------------------------|
| `GET`       | `/users`          | `UsersController.get`                |
| `POST`      | `/users`          | `UsersController.post`               |
| `PUT`       | `/users/42`       | `UsersController['put :id']`         |
| `PATCH`     | `/users/42`       | `UsersController['patch :id']`       |
| `DELETE`    | `/users/42`       | `UsersController['delete :id']`      |
| `POST`      | `/users/save`     | `UsersController['post save']`       |
| `GET`       | `/users/42/info`  | `UsersController['get :id/info']`    |

### Method key convention: `'<verb>? <path tail>'`

A controller method key is `<path tail>` on its own, or `'<verb> <path tail>'` when the verb isn't `GET`. The auto-router only reassigns the HTTP method when the key has a space-separated verb prefix — otherwise it defaults to **GET**.

- A **custom action name with no verb prefix** (no space in the key) is still `GET`, e.g. `me(req, res)` on `AuthController` → `GET /auth/current`. Don't write `'get current'`; it's redundant.
- A **custom action that isn't `GET`** needs the verb spelled out, e.g. `'post login'` → `POST /auth/login`.
- The path tail can carry arbitrary nested segments and multiple params:

```js
// controllers/api/UsersController.js
module.exports = {

  // GET /api/users/123/orders/988
  'get :id/orders/:orderId': (req, res) => {
    // req.params → { id: '123', orderId: '988' }
  }

};

// controllers/api/AuthController.js
module.exports = {

  // GET /api/auth/current — no verb prefix needed, GET is the default
  current(req, res) { },

  // POST /api/auth/login
  'post login': (req, res) => { },

  // POST /api/auth/logout
  'post logout': (req, res) => { }

};
```

### Controllers stay thin — business logic lives in the model

Controllers only orchestrate the HTTP request/response cycle: read params, call the model, send the response with `res.vsr(...)` (REST API) or `res.render(...)` (server-side rendering). They should **not** contain business logic, validation rules, or data manipulation — that belongs on the model (instance/static methods, hooks, or virtuals), so it stays reusable outside the HTTP layer (crontabs, sockets, other models, tests).

### Controller example

```js
// vulkano/controllers/UserController.js
module.exports = {

  get(req, res) {
    res.vsr(Promise.resolve({ users: [] }));
  },

  'get :id': (req, res) => {
    res.vsr(Promise.resolve({ id: req.params.id }));
  },

  post(req, res) {
    res.vsr(Promise.resolve({ data: req.body }));
  },

  'put :id': (req, res) => {
    res.vsr(Promise.resolve({ updated: req.params.id, data: req.body }));
  },

  'delete :id': (req, res) => {
    res.vsr(Promise.resolve({ deleted: req.params.id }));
  }

};
```

### Explicit routes — `config/routes.js`

`routes.js` exists for whatever the convention can't resolve on its own — an absolute path, a catch-all for a frontend router, or breaking the "resource segment = controller filename" rule entirely. For everything else, don't add entries here; a redundant explicit entry just gives the route two sources of truth that can drift apart.

```js
module.exports = {

  // Routes as string — simple and easy to use
  '/about-me': 'AboutController.get',

  // Catch-all for a frontend router (SPA)
  '/admin*': 'AdminController.get',

  // Routes as definition — most flexible
  '/test': (req, res) => {
    res.json({ message: 'Hello, world!' });
  },

  // Routes as method — more advanced (`app.vulkano` is the Express instance)
  custom() {
    app.vulkano.get('/test2', (req, res) => {
      res.json({ hello: 'world2' });
    });
  }

};
```

---

## Responses — `res.vsr()`

Every controller action uses `res.vsr(promise)`. It wraps the resolved value in a standard envelope:

```json
{ "success": true, "statusCode": 200, "data": { … } }
```

Errors are handled automatically:

```js
// Custom error with status code
res.vsr(VSError.reject('Not allowed', 403));

// 404
res.vsr(VSError.notFound('User'));

// Plain rejection → 500
res.vsr(Promise.reject(new Error('Something went wrong')));
```

---

## Scaffold — zero-code REST API

Point a controller at a model and get a full REST API for free:

```js
// app/controllers/api/ProductsController.js
module.exports = {
  scaffold: 'Product', // Mongoose model name — must exist as global.Product
  allowedMethods: ['get', 'post', 'put', 'patch', 'delete']
};
```

`scaffold` is the model name directly, so no separate `model` field is needed. If the string
doesn't match a loaded model (`global.Product` in this example), Vulkano throws at startup instead
of silently registering an empty controller.

> You may also see `scaffold: true` paired with a separate `model: 'Product'` field — both forms are
> supported and behave identically, but `scaffold: 'Product'` is the recommended, shorter form.

This automatically exposes:

| Method   | Path                | Action           |
|----------|---------------------|------------------|
| `GET`    | `/api/products`     | List (paginated) |
| `GET`    | `/api/products/:id` | Get by ID        |
| `POST`   | `/api/products`     | Create           |
| `PUT`    | `/api/products/:id` | Replace          |
| `PATCH`  | `/api/products/:id` | Partial update   |
| `DELETE` | `/api/products/:id` | Soft-delete      |

Query string params supported on list: `page`, `per_page`, `sort`, `search`, `fields`.

A scaffold controller wires each allowed HTTP method to the matching standard CRUD method on the model
(`getAll`, `get<ModelName>`, `create`, `update`, `delete` — see [Models](#models-business-logic-lives-here) below), so the model
still needs those methods implemented or auto-generated.

NOTE: To find examples with the best practices, look in `examples/controllers` to find a well-structured controller for server side rendering, like `ExampleController.js`, REST API like `RestExampleController.js` and Scaffold REST API like `RestScaffoldController.js`.

---

## Models: business logic lives here

Models live in `app/models/` are auto-loaded as globals. A file `Project.js` becomes `global.Project` (singular).
Every model gets `attributes` (Mongoose schema fields), plus `active`, `createdAt`, `updatedAt` automatically.

Models are where validation, data manipulation, and business rules belong — not just the raw Mongoose schema. Controllers should only ever call methods on the model; they shouldn't reach into `Model.find(...)` or manipulate documents directly.

### Standard CRUD methods
Every model is expected to expose this same set of methods, so controllers can call them the same way regardless of the resource:

| Method                 | Purpose                                                            |
|------------------------|--------------------------------------------------------------------|
| `getAll(props)`        | List/paginate records. `props` = `{ page, perPage, search, sort }` |
| `get<ModelName>(id)`   | Get a single record by id (e.g. `getProduct(id)`)                  |
| `create(data)`         | Create a new record                                                |
| `update(id, data)`     | Update a record by id                                              |
| `delete(id)`           | Soft-delete a record (sets `active: false`)                        |

```js

// app/models/Product.js
module.exports = {
  attributes: {
    name:  { type: String, required: true },
    price: { type: Number, default: 0 },
    tags:  { type: [String] }
  },
};
```

NOTE: To find examples with the best practices for available methods ahd hooks, look in `examples/models` and read the file `Example.js`, and Scaffold Model API `ExampleWithScaffold.js`.

### Vulkano models — don't hand-roll `createdAt` or `updatedAt`

`@vulkano/core`'s `database/mongodb.js` auto-injects `createdAt: Date` and `updatedAt: Date` attributes into every model schema if the model doesn't already define them (`if (!attributes.createdAt) { ... }`, same for `updatedAt`). Never add a manual timestamp field (`at`, `date`, `timestamp`, `createdAt`, `updatedAt`, etc.) to a model's `attributes` — they're already automatic in Vulkano, so a hand-rolled one is redundant, and if named anything other than `createdAt`/`updatedAt` it also fights the framework's own sort/index defaults (`database/scaffold.js` defaults `sort: 'createdAt|DESC'`). Use `createdAt` and `updatedAt` directly in indexes, sort strings, and business logic.

---

## Key conventions

### Naming: controllers in plural (recommended but not mandatory), models in singular
`@vulkano/core` pairs each model with a controller by name, so the naming convention is what makes the auto-routing work:
- **Model** → singular PascalCase (e.g., `Product.js` → `global.Product`)
- **Controller** → plural PascalCase + `Controller` suffix (e.g., `ProductsController.js`)

---

## Built-in Global Libs

All files in `app/services/` are auto-loaded as globals. The framework also exposes:

| Global      | Description                                                     |
|-------------|-----------------------------------------------------------------|
| `VSError`   | Structured error factory (`reject`, `notFound`, `badRequest`)   |
| `Jwt`       | Sign / verify JWT tokens                                        |
| `Paginate`  | Query serialization and pagination helpers                      |
| `Merge`     | Deep-merge utility (deepmerge-compatible, full option support)  |
| `Encrypter` | Hash and compare passwords (bcrypt-based)                       |
| `Filter`    | Input sanitization helpers                                      |
| `Crontab`   | Schedule recurring jobs with cron expressions                   |
| `ApiClient` | HTTP client for calling external APIs (native fetch + undici)   |
| `Download`  | File download helper                                            |
| `i18n`      | Internationalization via i18next                                |
| `mongoose`  | Mongoose instance                                               |

---

## File Uploads

Vulkano uses [Multer](https://github.com/expressjs/multer) v2. Files are available on `req.files` after a `multipart/form-data` POST:

```js
'post upload': function (req, res) {
  const files = (req.files || []).map((f) => ({
    fieldname:    f.fieldname,
    originalname: f.originalname,
    mimetype:     f.mimetype,
    size:         f.size
  }));
  res.vsr(Promise.resolve({ uploaded: files.length, files }));
}
```

---

## JWT Authentication

Vulkano integrates JWT internally to validate protected routes, using
[`express-jwt`](https://www.npmjs.com/package/express-jwt) (route middleware) and
[`jwt-simple`](https://www.npmjs.com/package/jwt-simple) (encode/decode) under the hood. Configured
in `app/config/express/jwt.js` — see [`examples/config/express/jwt.js`](examples/config/express/jwt.js)
for a full example configuration.

When `enabled: true`, every request under `path` is checked by an `express-jwt` middleware, which
calls `Jwt.getToken(req)` to pull the token from the configured header (`x-token-auth` by default),
cookie, or query parameter, then validates it with `Jwt.decode()`.

### Signing a token

`Jwt.encode(data)` requires an `expiration` field in the payload (a millisecond timestamp) —
without it, `Jwt.decode()` rejects the token by default:

```js
// app/controllers/api/AuthController.js
module.exports = {
  'post login'(req, res) {
    res.vsr(User.login(req.body).then((user) => ({
      user,
      token: Jwt.encode({
        _id: user._id,
        expiration: String(Date.now() + 24 * 60 * 60 * 1000)   // 24h from now
      })
    })));
  }
};
```

> To issue tokens that never expire, set `expiration: false` in `app/config/express/jwt.js` — this
> disables the expiration check on `Jwt.decode()`, not just for tokens missing the field.

### Reading the current user

`req.auth` isn't set automatically — decode the token in your own middleware
(`app/config/middlewares/`) or per-controller. See
[`examples/config/middlewares/auth.js`](examples/config/middlewares/auth.js) for a full example:

```js
const { _id } = Jwt.decode(Jwt.getToken(req)) || {};
```

---

## Cron Jobs

When Vulkano starts, you can configure your own tasks to run at a given time.

```js
// app/config/bootstrap.js
module.exports = (start) => {

  start(() => {

    Crontab.schedule({
      time: '0 0 11 * * 5',
      timeZone: 'America/New_York',
      task: () => {
        console.log('Crontab every Friday (5) at 11');
        Weekly.report().catch( () => {});
      },
      onComplete: () => {
        console.log(`Weekly report job completed at ${new Date()}`);
      }
    });

  });

};
```

---

## i18n

Vulkano wires up [i18next](https://www.i18next.com/) automatically. One file per locale in
`app/config/locales/`, keyed by filename — no manual registration needed:

```js
// app/config/locales/en.js
module.exports = {
  welcome: 'Welcome',
  goodbye: 'Goodbye'
};

// app/config/locales/es.js
module.exports = {
  welcome: 'Bienvenido',
  goodbye: 'Adiós'
};
```

The global `i18n` is the configured i18next instance — use `i18n.t('key')` anywhere in your app
(controllers, models, services):

```js
// app/controllers/HomeController.js
module.exports = {
  get(req, res) {
    res.vsr(Promise.resolve({ message: i18n.t('welcome') }));  // "Welcome"
  }
};
```

Default language is `en`, with `en` as the fallback if a key or locale is missing. To switch the
active language at runtime, call `i18n.changeLanguage('es')`.

---

## Socket.io

Enabled via `app/config/sockets/config.js`. Adapters for Redis and MongoDB are included out of the box (default is in-memory).

```js
// app/config/sockets/config.js
module.exports = {

  // Enable sockets
  enabled: true,

  // Socket IO Adapter (redis|mongodb|memory)
  adapter: 'memory',

  // Socket configuration
  config: {
    transports: ['websocket', 'polling'],
    timeout: 4000,
    interval: 2000,
  },

  // Connections
  connections: {
    users: 0,
    clients: {}
  }

};
```

Events map socket event names to a controller action, the same `folder.<Name>Controller.method` convention used by `routes.js`:

```js
// app/config/sockets/events.js
module.exports = {
  'echo': 'sockets.EchoController.echo'
};
```

```js
// app/controllers/sockets/EchoController.js
module.exports = {
  echo({ socket, body }, callback) {
    callback({
      echo: body,
      userId: (socket.request.user || {})._id || null
    });
  }
};
```

Handler signature is always `({ socket, body }, callback)`.

Optional CORS check (`app/config/sockets/cors.js`):

```js
module.exports = (req, callback) => {
  const { origin, host } = req.headers || {};
  const realOrigin = origin || host;
  const allowedOrigin = ['localhost', 'yourdomain.com'];

  const found = allowedOrigin.some((o) => (realOrigin || '').indexOf(o) !== -1);

  if (found) {
    callback(null, true);
  } else {
    callback(new Error(`Invalid origin ${realOrigin} - Socket CORS`));
  }
};
```

Optional auth middleware, run before a socket connection is accepted (`app/config/sockets/middlewares/auth.js`):

```js
module.exports = (socket, next) => {
  const user = Jwt.socket(socket);
  const { _id } = user || {};

  if (!_id) {
    next(new Error(`Invalid user ${_id || 'or token'}`));
  }

  socket.request.user = user || {};
  next();
};
```

Redis/MongoDB adapter settings live in `app/config/sockets/adapters/redis.js` and `app/config/sockets/adapters/mongodb.js`:

```js
// app/config/sockets/adapters/redis.js
module.exports = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || '6379',
  password: process.env.REDIS_PASSWORD || ''
};
```

```js
// app/config/sockets/adapters/mongodb.js
module.exports = {
  connection: process.env.SOCKETS_MONGO_URI || null,
  collection: process.env.SOCKETS_MONGO_COLLECTION || 'socket.io-adapter-events'
};
```

Available globally as `io` (the Socket.io server instance) and `app.socket` (the current socket).

See `test/fixtures/app/config/sockets` and `test/fixtures/app/controllers/sockets` for the full working example used by the integration tests.

---

## Configuration — `app/config/settings.js`

```js
module.exports = {

  // PORT to listen on
  port: process.env.PORT || 3000,

  // Database configuration
  database: {

    // MONGO_URI connection
    connection: process.env.MONGO_URI,

    // Settings before to connect
    settings: {
      strictQuery: false,
      debug: false
    },

    // Additional config to mongoose
    config: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // family: 4 // 4 (IPv4), 6 (IPv6), or null (default: OS family)
      // useFindAndModify: false,
      // useCreateIndex: true
    }

  }
};
```

---

## Express Configuration

Each file in `app/config/express/` configures one Express middleware. All are optional — omitted
files fall back to sane defaults — and every file is auto-merged into the final config used by
`bootstrap/server.js`. Full working examples for every file live in
[`examples/config/express/`](examples/config/express).

| File                    | Configures                          | Package used                                              |
|-------------------------|--------------------------------------|-------------------------------------------------------------|
| [`settings.js`](examples/config/express/settings.js)             | Core server behavior (`poweredBy`, `timeout`, `uploadPath`, `trustProxy`) | — (native Express) |
| [`cookies.js`](examples/config/express/cookies.js)               | Cookie parsing + session secret     | [`cookie-parser`](https://www.npmjs.com/package/cookie-parser), [`express-session`](https://www.npmjs.com/package/express-session) |
| [`cors.js`](examples/config/express/cors.js)                     | Cross-Origin Resource Sharing       | — (handled with a custom middleware, no `cors` package) |
| [`jwt.js`](examples/config/express/jwt.js)                       | JWT authentication middleware       | [`express-jwt`](https://www.npmjs.com/package/express-jwt), [`jwt-simple`](https://www.npmjs.com/package/jwt-simple) |
| [`csp.js`](examples/config/express/csp.js)                       | Content Security Policy rules       | — (custom header builder) |
| [`helmet.js`](examples/config/express/helmet.js)                 | Security headers                    | [`helmet`](https://helmetjs.github.io/) |
| [`permissionPolicy.js`](examples/config/express/permissionPolicy.js) | `Permission-Policy` header       | — (custom header builder) |
| [`json.js`](examples/config/express/json.js)                     | JSON body parser MIME types         | — (native `express.json()`) |

---

## Running Tests

```bash
npm test              # all suites
npm run test:watch    # watch mode
npm run test:coverage # with coverage report
```

> Tests require Node.js 22. Use `nvm use 22` if needed.

---

## Support

- [Open an issue](https://github.com/vulkanojs/vulkano-core/issues)
- [Open Collective — Backers](https://opencollective.com/vulkanojs#backers)
- [Buy me a coffee](https://buymeacoffee.com/argordmel)

---

## License

MIT © [Vulkano Team](https://github.com/vulkanojs)
