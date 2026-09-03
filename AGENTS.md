# Vulkano Core — CLAUDE.md

## Overview

`@vulkano/core` (v1.26.0) is the engine of the Vulkano MVC framework. It bootstraps the environment, connects to the database, and auto-loads all models, controllers, services, and responses before starting the Express server. The user app only calls `require('@vulkano/core')`.

```
/**
 * app.js
 *
 * To start the server, run: `node app.js`.
 *
 */

const vulkano = require('@vulkano/core');

vulkano();
```

---

## File structure

```
core/
├── app.js                        ← Entry point: full bootstrap sequence
├── bootstrap/
│   ├── express.js                ← Merges all Express configuration sources
│   ├── logger.js                 ← Console helpers (colors, column formatting)
│   ├── responses.js              ← Auto-loads and injects response methods into res
│   ├── server.js                 ← Starts Express, registers middleware, routes, sockets
│   ├── services.js               ← Auto-loads libs/services and injects them as globals
│   └── views.js                  ← Nunjucks base config (path, filters, helpers)
├── controllers/
│   ├── controllers.js            ← Auto-discovers *Controller.js files, builds route table
│   └── ScaffoldController.js     ← Auto-generates CRUD methods for scaffold:true controllers
├── database/
│   ├── mongodb.js                ← Connects Mongoose, compiles models, registers them as globals
│   ├── models.js                 ← Loads user models, merges lifecycle callbacks and scaffold methods
│   └── scaffold.js               ← Base CRUD methods: getAll, getByField, create, update, delete, subdocs
├── libs/
│   ├── ApiClient.js              ← Axios wrapper for outbound HTTP requests
│   ├── Crontab.js                ← node-cron wrapper for scheduled tasks
│   ├── Download.js               ← File download helper
│   ├── Encrypter.js              ← AES-256-CBC encrypt/decrypt
│   ├── Filter.js                 ← String filter system (trim, prefix, suffix, etc.)
│   ├── Jwt.js                    ← JWT encode/decode + Express middleware
│   ├── Paginate.js               ← Mongoose pagination, search, and filtering
│   ├── VSError.js                ← Standard error class with statusCode
│   ├── i18n.js                   ← i18next wrapper + moment locale sync
│   └── filters/                  ← Individual filter modules (trim, ltrim, rtrim, prefix, suffix, number, objectId, saveinteger)
├── responses/
│   └── vsr.js                    ← Vulkano Standard Response: resolves a Promise → JSON
└── views/
    ├── filters/                  ← Core Nunjucks filters (vCamelCase, vLowercase)
    └── errors/                   ← Dev-mode HTML error templates (no_controller, no_action, no_view, exception)
```

---

## Bootstrap sequence (`app.js`)

1. Sets path globals: `START_TIME`, `ABS_PATH`, `APP_PATH`, `PUBLIC_PATH`, `CORE_PATH`, `app`, `_`
2. Loads `.env` via dotenv
3. Auto-discovers all user config via `include-all` from `app/config/`
4. Deep-merges config in order: general → settings → `env/{NODE_ENV}` → `local.js`
5. Stores result in `app.config`
6. Runs in sequence: `loadServices()` → `loadDatabase()` → `loadControllers()` → `loadServer()`
7. Registers `app.routes` and `app.server`
8. Calls the user's `bootstrap.js`, which in turn calls `app.server.start(cb)`
9. Inside `start()`: registers middleware, routes, sockets, then calls `cb()`

---

## Auto-loading system

Vulkano automatically discovers, loads, and registers all application components at startup —
**no manual `require()` or imports are needed** inside controllers, models, or services.

This is the core design principle of the framework: models, controllers, libraries, and services are
all loaded and made globally accessible at boot time. This reduces boilerplate and means any file in
the app can use `User`, `Paginate`, `Jwt`, or any other component directly without importing it.

Every component type is scanned from **two locations**: the framework core and the user's `app/`
project folder. Both are merged, with the project's files taking precedence over core files when
names collide.

---

### 1. Libraries and services → global scope

**Loader:** `bootstrap/services.js`

Scanned directories (all merged into a single global namespace):

```
core/libs/*.js           ← built-in framework libraries
app/services/*.js        ← project-level services
app/libs/*.js            ← project-level utility libraries
```

Every exported module is injected as `global[filename]`. The global name is the **filename without
extension**, PascalCase by convention:

| File | Global |
|---|---|
| `core/libs/Paginate.js` | `global.Paginate` |
| `core/libs/VSError.js` | `global.VSError` |
| `core/libs/Jwt.js` | `global.Jwt` |
| `core/libs/Encrypter.js` | `global.Encrypter` |
| `core/libs/Filter.js` | `global.Filter` |
| `core/libs/ApiClient.js` | `global.ApiClient` |
| `core/libs/Crontab.js` | `global.Crontab` |
| `core/libs/i18n.js` | `global.i18n` |

> `ActiveRecord` and `AppController` are explicitly excluded from globals even if present.

If a project file has the same name as a core lib (e.g. `app/services/Paginate.js`), the project
version wins and replaces the core one globally.

**Available in every controller, model, service, or config file — no import needed:**
```js
VSError.reject('Not found', 404);
Paginate.get(User, query);
Jwt.encode({ userId: '123' });
Filter.get('  hello  ', 'trim');
```

---

### 2. Models → compiled Mongoose models in global scope

**Loader:** `database/models.js` + `database/mongodb.js`

Scanned directory:
```
app/models/*.js          ← all project models (one file per model)
```

For each model file the loader:
1. Reads `attributes` and separates virtual fields
2. Adds automatic fields: `active` (Boolean, default `true`), `createdAt` (Date), `updatedAt` (Date)
3. Sets `trim: true` on all non-Boolean attributes (disable with `trim: false`)
4. Merges default lifecycle callbacks (`beforeSave`, `afterSave`, `beforeUpdate`, etc.)
5. Merges base scaffold CRUD methods from `database/scaffold.js`
6. Compiles the Mongoose schema and registers it as `global[ModelName]`

Collection name is always `modelName.toLowerCase()`:

| File | Global | MongoDB collection |
|---|---|---|
| `app/models/User.js` | `global.User` | `user` |
| `app/models/Product.js` | `global.Product` | `product` |
| `app/models/BlogPost.js` | `global.BlogPost` | `blogpost` |

**Available in any controller, service, or other model — no import needed:**
```js
User.create(req.body);
Product.getAll(req.query);
BlogPost.getByField(req.params.id);
```

---

### 3. Controllers → route table

**Loader:** `controllers/controllers.js`

Scanned directory:
```
app/controllers/**/*Controller.js     ← all controllers, including subfolders
```

For each controller file the loader:
- Reads the exported object's method names as route definitions
- Builds a flat route map: `{ "get /user/": fn, "post /user/save": fn, ... }`
- If the controller has `scaffold: 'ModelName'` (or `scaffold: true` + `model`), injects CRUD methods before building routes — throws if the model isn't found in global scope

Subfolder = URL namespace, **any nesting depth** — ideal for grouping controllers by module/domain:
```
app/controllers/UserController.js                     → /user/...
app/controllers/api/ProductController.js               → /api/product/...
app/controllers/admin/ReportController.js               → /admin/report/...
app/controllers/api/config/VatTypesController.js         → /api/config/vat-types/...
app/controllers/api/config/billing/InvoiceController.js  → /api/config/billing/invoice/...
```

The loader walks the folder tree recursively (`processNode` in `controllers.js`): a key ending in
`Controller` is a controller file, anything else is a module/namespace folder that gets kebab-cased
and appended to the path, then recursion continues into it. Same `XxxController.js` filename at
different depths produces fully independent routes — e.g. `VatTypesController.js` can exist at the
root, under `api/`, and under `api/config/` at once, each resolving to its own namespace
(`/vat-types/`, `/api/vat-types/`, `/api/config/vat-types/`) with no collision.

**Multi-word controller names → kebab-case URL segment:**
The controller name (filename minus `Controller`) is converted with `toKebabCase()`
before becoming a URL segment — a hyphen is inserted at each PascalCase word boundary,
then the whole thing is lowercased. A single-word name is unaffected.

```
app/controllers/MyaccountController.js                            → /myaccount/...
app/controllers/MyAccountController.js                             → /my-account/...
app/controllers/inventory/MaterialReceptionsController.js          → /inventory/material-receptions/...
```

**Route naming convention:**
```js
// app/controllers/UserController.js
module.exports = {
  get(req, res) { ... },              // GET  /user/
  'get :id'(req, res) { ... },        // GET  /user/:id
  'post save'(req, res) { ... },      // POST /user/save
  'delete :id'(req, res) { ... },     // DELETE /user/:id
  '/absolute/path'(req, res) { ... }, // GET  /absolute/path  (no namespace)
  'edit :id'(req, res) { ... }        // GET  /user/edit/:id (no method prefix → defaults to GET)
}
```

> **Important:** Declare specific routes **before** parameterized routes (`:id`) in the object.
> Express matches in registration order — a wildcard declared first will shadow specific paths.

> **Method-prefix fallback:** the first space-separated token is only treated as the HTTP method
> if it's one of `get`, `post`, `put`, `patch`, `delete`. Otherwise the loader defaults to `GET` and
> joins the whole key with `/` to build the path — e.g. `'edit :id'` → `GET /user/edit/:id`. This
> lets you write multi-segment action names (`'edit :id'`, `'archive :id/:reason'`) without an
> explicit method prefix.

---

### 4. Responses → injected into `res`

**Loader:** `bootstrap/responses.js`

Scanned directories (merged, project files override core):
```
core/responses/*.js      ← built-in response helpers
app/responses/*.js       ← project-level custom responses
```

Every exported function is attached to the Express `res` object. The method name is the
**filename without extension**:

| File | Available as |
|---|---|
| `core/responses/vsr.js` | `res.vsr(promise, statusCode?)` |
| `app/responses/render.js` | `res.render(...)` *(example)* |
| `app/responses/ok.js` | `res.ok(data)` *(example)* |

**Available in any controller handler — no import needed:**
```js
get(req, res) {
  res.vsr(User.getAll(req.query));        // standard VSR JSON response
  res.vsr(User.create(req.body), 201);    // with custom HTTP status
}
```

Custom response example:
```js
// app/responses/paginated.js
module.exports = function paginated(data) {
  const { res } = this.req;
  res.status(200).json({ success: true, ...data });
};
// Usage: res.paginated({ items, total })
```

---

## All globals available across the app

These are set automatically — never import them manually:

| Global | Set by | What it is |
|---|---|---|
| `app` | `app.js` | Config, server, routes, pkg |
| `app.config` | `app.js` | Full merged configuration |
| `app.vulkano` | `server.js` | Express app instance |
| `app.server` | `server.js` | Node.js HTTP server |
| `app.redisClient` | `server.js` | Redis client (if enabled) |
| `app.nunjucks` | `server.js` | Nunjucks environment instance |
| `app.socket` | `server.js` | Current Socket.io socket |
| `io` | `server.js` | Global Socket.io server instance |
| `mongoose` | `mongodb.js` | Mongoose instance |
| `Virtual` | `mongodb.js` | `'Virtual'` marker string for virtual fields |
| `Mixed` | `mongodb.js` | `mongoose.Schema.Types.Mixed` |
| `[ModelName]` | `mongodb.js` | Each compiled model (e.g. `User`, `Product`) |
| `Filter` | `services.js` | String filter library |
| `Paginate` | `services.js` | Pagination and search library |
| `VSError` | `services.js` | Standard error class |
| `Jwt` | `services.js` | JWT encode/decode library |
| `Encrypter` | `services.js` | AES-256-CBC encrypt/decrypt |
| `ApiClient` | `services.js` | Outbound HTTP client |
| `Crontab` | `services.js` | Cron job scheduler |
| `i18n` | `services.js` | i18next instance |
| `_` | `app.js` | Underscore.js |

---

## Route system

### Convention-based auto-routing

`controllers/controllers.js` reads all `*Controller.js` files and generates routes from method names:

```js
// HomeController.js
module.exports = {
  get(req, res) { ... },              // → GET  /home/
  'post save'(req, res) { ... },      // → POST /home/save
  'get :id'(req, res) { ... },        // → GET  /home/:id
  'delete :id'(req, res) { ... },     // → DELETE /home/:id
  '/absolute/path'(req, res) { ... }  // → GET  /absolute/path
}
```

**Parsing rules:**
- Key with space: `'METHOD action'` → `[method, pathSegment]`
- Key is only an HTTP method (`get`, `post`, `put`, `delete`) → controller root path
- Key starts with `/` → used as an absolute route, not namespaced
- Controller in subfolder (`api/UserController.js`) → path is `/{folder}/{controller}/{action}`

### Explicit routes (`app/config/routes.js`)

```js
module.exports = {
  'GET /': 'HomeController.get',
  'POST /api/users': 'api.UserController.create',
  '/about': 'HomeController.about',             // defaults to GET
  '/handler': (req, res) => res.send('ok')      // inline function
}
```

### Known routing limitations
- Only supports: `get`, `post`, `put`, `patch`, `delete`. No `head`, `options`.
- Parsing uses `split(' ')` — fragile with extra whitespace (only the first two tokens are ever considered when the first token IS a valid method; the fallback-to-GET path joins all tokens with `/`).
- Does not validate that the controller/action exist before registering (fails at runtime with `console.error`).
- Route conflicts resolved by registration order (first registered wins).

---

## Models

### Definition

```js
// app/models/User.js
module.exports = {
  attributes: {
    name:  { type: String, required: true },
    email: { type: String },
    age:   { type: Number },
    // Virtual field — computed, not stored in MongoDB
    fullLabel: { type: 'Virtual', get() { return this.name; } }
  },
  indexes: [{ email: 1 }],
  plugins: [],
  beforeSave(next) { next(); },
  afterSave() {}
}
```

**Auto-added fields** (always present, no need to declare):
- `active: Boolean` (default: `true`) — soft-delete flag
- `createdAt: Date` (default: `Date.now`)
- `updatedAt: Date`

**Auto-trim:** All non-Boolean attributes get `trim: true` by default. Disable with `{ type: String, trim: false }`.

### Scaffold methods available on every model

> **Model scaffold vs ScaffoldController are two different things.**
> Model scaffold provides database-level CRUD methods on the model class.
> ScaffoldController generates HTTP routes on a controller. They are independent.

```js
Model.getAll(props)                           // paginated list
Model.getByField(value, field?)               // by _id or custom field
Model.create(data)                            // insert new record
Model.update(id, data)                        // merge-update existing record
Model.delete(id)                              // soft delete — sets active: false (no hard delete)
Model.createSubdoc(key, parentId, data)       // push to subdocument array
Model.updateSubdoc(key, parentId, subdocId, data)
Model.removeSubdoc(key, parentId, subdocId)
Model.deleteSubdoc(...)                       // alias for removeSubdoc
```

Auto-generated aliases per model (e.g. for `User`):
```js
User.getAllUser(props)   // → User.getAll(props)
User.getUser(id)        // → User.getByField(id)
```

### Overriding scaffold methods

Any method defined in the model file overrides the scaffold default:

```js
// app/models/Product.js
module.exports = {
  attributes: { ... },

  // Override getAll to enable search and custom sort
  getAll(props) {
    const defaultProps = {
      sort: 'name|ASC',
      searchBy: ['name', 'sku'],   // fields to search on
      filter: { active: true }
    };
    const query = Paginate.serializeQuery(defaultProps, props);
    return Paginate.get(this, query);
  }
};
```

> **Note:** `searchBy` is `[]` in the scaffold default, so text search via `?search=` query param
> does nothing unless you override `getAll` and configure `searchBy`.

### Auto-populate (relations)

`Model.getAll(props)` and `Model.getByField(value, field, props)` — the scaffold defaults — expand
`ref` relations on request via `?populate=`, using two helpers from `database/scaffold.js`:
`this._getSanitizedPopulate(props)` and `this._buildPopulate(props, extra?)`.

**Security gate — a relation is never populated by default.** A ref field only becomes reachable
through `?populate=` when its own attribute definition opts in:

```js
// app/models/Product.js
module.exports = {
  attributes: {
    name: { type: String, required: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      autopopulate: true   // ← without this, ?populate=supplier is silently ignored
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      autopopulate: true
    }
  }
  // getAll/getByField are inherited from the scaffold as-is — no override needed
};
```

Add `autopopulate: true` to every `ref` field you want populatable; a model with several relations
(supplier, category, unit of measure, ...) needs no separate list to maintain — it's declared right
on the field. A `ref` field left without it stays a raw id no matter what the caller requests.

**One-off override:** a model that overrides `getAll`/`getByField` can allow a relation for that
call only, without adding `autopopulate: true` to the schema, via the second argument:

```js
const populate = this._buildPopulate(props, ['supplier']);
```

**Query syntax** (`?populate=...`):

```
?populate=supplier                    → full Supplier doc
?populate=supplier,category           → both, full docs
?populate=supplier:name               → only { _id, name } (Mongoose always keeps _id)
?populate=supplier:name|address       → several fields, pipe-separated
?populate=supplier:name,category      → per-relation fields only affect that relation
```

Relation names and field lists are trimmed and lower-cased; unknown/misspelled relation names are
silently ignored (no error, no populate). The field-select syntax lives entirely inside the
`populate` value — deliberately not a separate `?supplier=name` param, since that would collide
with `supplier` used as an actual filter/query param on the same route.

---

## ScaffoldController

> **ScaffoldController vs model scaffold are two different things.**
> ScaffoldController generates HTTP routes on a controller.
> Model scaffold provides database-level CRUD methods on the model class. They are independent.

When a controller sets `scaffold` to a model name, the framework automatically generates all 5 HTTP routes:

```js
// app/controllers/api/ProductController.js
module.exports = {
  scaffold: 'Product',                    // must exist as global.Product — throws at startup otherwise
  allowedMethods: ['get', 'post', 'put']  // optional: restrict to these methods only
}
```

> The older `scaffold: true` + separate `model: 'Product'` form is still supported and behaves
> identically — `scaffold: 'Product'` is just the shorter, recommended way to write it.

Generates las siguientes rutas, cada una delegando al método correspondiente del modelo:

| Ruta | Método del modelo | Status |
|---|---|---|
| `GET  /api/product/`      | `Product.getAll(req.query)`        | 200 |
| `GET  /api/product/:id`   | `Product.getByField(req.params.id)`| 200 |
| `POST /api/product/`      | `Product.create(req.body)`         | 201 |
| `PUT  /api/product/:id`   | `Product.update(id, req.body)`     | 202 |
| `DELETE /api/product/:id` | `Product.delete(id)` — soft delete | 204 |

> **Important:** Scaffold endpoints have no authentication middleware by default.
> Protect them via JWT config or custom middleware.

---

## VSR — Vulkano Standard Response

`res.vsr(promise, statusCode?)` is the standard way to respond in all controllers.

```js
get(req, res) {
  res.vsr(User.getAll(req.query));          // 200
  res.vsr(User.create(req.body), 201);      // 201
}
```

- Expects a **Promise** (returns 500 with descriptive error if not)
- On `.then()`: responds `{ success: true, statusCode, data: result }`
- On `.catch()`: responds `{ success: false, statusCode, error: { detail, errorCode, errorName } }`
- `.finally()`: always calls `res.status(code).jsonp(output)`

---

## VSError

Available globally — no import needed:

```js
VSError.reject('Not allowed', 403)      // Promise.reject with VSError
VSError.notFound('User')                // Promise.reject with 404
new VSError('message', 500, props)      // direct instantiation
```

---

## Paginate

Available globally — no import needed:

```js
Paginate.get(Model, query, populate?)
Paginate.serializeQuery(defaultProps, requestQuery)
```

**Supported query params:** `page`, `per_page`, `search`, `searchType` (contains/startwith/endwith), `sort` (e.g. `createdAt|DESC`), `fields`

**Response shape from `_set()`:**
```js
{ items, cursor, page, perPage, next, prev, totalPages, totalItems }
```

- `next` is `false` when `(page * perPage) >= totalItems`
- `prev` is `false` on page 1, or when current page exceeds `totalPages`
- `cursor` is the index of the first item on the current page (1-based)
- `page=all` skips pagination and returns a plain array via `Model.find()`

---

## JWT (`Jwt.js`)

Available globally — no import needed:

```js
Jwt.encode(data)          // AES-encrypts payload, then encodes as JWT
Jwt.decode(token)         // decodes and validates expiration
Jwt.getToken(req)         // extracts token from header / cookie / query param
Jwt.socket(socket)        // extracts token from Socket.io handshake
Jwt.init(opts)            // returns an express-jwt middleware instance
```

Tokens require an `expiration` field. Tokens without it are rejected unless `config.jwt.expiration === false`.

---

## Configuration hierarchy (merge order)

```
app/config/*.js                  ← general config
app/config/env/{NODE_ENV}/*.js   ← environment overrides
app/config/local.js              ← local overrides (gitignored)
```

All sources are deep-merged with `deepmerge`. Final result is in `app.config`.

**Key config files:**
- `settings.js` — port, database connection, paths
- `express/cors.js`, `express/jwt.js`, `express/csp.js`, `express/cookies.js`
- `routes.js` — explicit route mappings
- `bootstrap.js` — startup hook (**required**)
- `sockets/` — Socket.io config and adapters

---

## Sockets (Socket.io)

Enable with `config.sockets.enabled: true`. Adapters: `memory` (default), `redis`, `mongodb`.

```js
// app/config/sockets/events.js
module.exports = {
  'message': 'ChatController.message',
  'join': (socket, body, callback) => { ... }
}
```

Handler signature: `({ socket, body }, callback)`.

Available globally as `io` and `app.socket`.

---

## Known issues / tech debt

- **`services.js`** — All libs/services are injected into `global`. Makes unit testing hard without mocking globals.
- **`bluebird`** — Still imported in a few places. Not needed in Node 18+ where `Promise` is native.
- **`ApiClient`** — `rejectUnauthorized: false` disables SSL verification by default for all outbound requests.
- **`Crontab`** — Default timezone is `America/New_York` instead of UTC.
- **`path` and `fs` npm packages** — These are Node.js built-ins and should not be in `package.json` dependencies.

---

## Project conventions

- Controller files: `{Name}Controller.js` (PascalCase)
- Model files: `{Name}.js` (PascalCase) — becomes `global[Name]`
- Service/lib files: `{Name}.js` (PascalCase) — becomes `global[Name]`
- Response files: `{name}.js` (camelCase) — becomes `res.name()`
- Config: camelCase, one concern per file, organized in subfolders
- All API responses go through `res.vsr(promise)`
- Deletion is always soft (`active: false`); hard delete is not available by default — **this applies only to models**, not to controllers directly
- No TypeScript; tests live in `test/integration/` and run with Jest

## Tests

Run with:
```bash
npm test            # run all integration tests
npm run test:watch  # watch mode
npm run test:coverage
```

Requires `core/.env.test` with `TEST_DB_URI`, `TEST_PORT`, and `JWT_SECRET_KEY` (used to sign the test JWTs for socket auth). The test suite:
- Starts a full Vulkano fixture server as a child process
- Drops and rebuilds the test database on every run
- Covers: VSR response format, routing (params + query strings), scaffold CRUD, pagination, model validation, ReDoS protection, file uploads, sockets (handshake auth + event routing)
