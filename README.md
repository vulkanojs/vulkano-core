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
├── public/                 # Static files served over HTTP
│   ├── css/
│   ├── js/
│   ├── img/
│   └── files/              # Uploaded files
└── vulkano/                # Your application
    ├── config/
    │   ├── settings.js     # App-wide settings (port, database, JWT…)
    │   ├── routes.js       # Explicit route overrides (optional)
    │   ├── env/            # Per-environment config overrides
    │   ├── express/        # Express middleware customization
    │   ├── settings.js     # App-wide settings (port, database, JWT…)
    │   ├── routes.js       # Explicit route overrides (optional)
    │   └── locales/        # i18n translation files (en.js, es.js, etc.)
    ├── controllers/        # Request handlers
    ├── models/             # Mongoose model definitions
    └── services/           # Shared services & libs (auto-loaded as globals)
```

---

## Routing

Vulkano resolves routes **by convention** — no route file required for standard CRUD.

### Convention-based (automatic)

| HTTP method | URL              | Resolves to                         |
|-------------|------------------|-------------------------------------|
| `GET`       | `/user`          | `UserController.get`                |
| `POST`      | `/user`          | `UserController.post`               |
| `PUT`       | `/user/42`       | `UserController['put :id']`         |
| `PATCH`     | `/user/42`       | `UserController['patch :id']`       |
| `DELETE`    | `/user/42`       | `UserController['delete :id']`      |
| `POST`      | `/user/save`     | `UserController['post save']`       |
| `GET`       | `/user/42/info`  | `UserController['get :id/info']`    |

### Controller example

```js
// vulkano/controllers/UserController.js
module.exports = {

  get(req, res) {
    res.vsr(Promise.resolve({ users: [] }));
  },

  'get :id': function (req, res) {
    res.vsr(Promise.resolve({ id: req.params.id }));
  },

  'post save': function (req, res) {
    res.vsr(Promise.resolve({ saved: true }));
  }

};
```

### Explicit routes — `config/routes.js`

```js
module.exports = [
  { method: 'GET',  path: '/health', controller: 'StatusController', action: 'ping' },
  { method: 'POST', path: '/auth/login', controller: 'AuthController', action: 'login' },
];
```

You can also register routes with inline handlers or using `app.vulkano.get/post/…`.

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
// vulkano/controllers/api/ProductController.js
module.exports = {
  scaffold: 'Product',           // Mongoose model name
  allowedMethods: ['get', 'post', 'put', 'patch', 'delete']
};
```

This automatically exposes:

| Method   | Path               | Action           |
|----------|--------------------|------------------|
| `GET`    | `/api/product`     | List (paginated) |
| `GET`    | `/api/product/:id` | Get by ID        |
| `POST`   | `/api/product`     | Create           |
| `PUT`    | `/api/product/:id` | Replace          |
| `PATCH`  | `/api/product/:id` | Partial update   |
| `DELETE` | `/api/product/:id` | Soft-delete      |

Query string params supported on list: `page`, `per_page`, `sort`, `search`, `fields`.

---

## Models

Models live in `vulkano/models/` and are auto-loaded as globals (e.g., `Product`).

```js
// vulkano/models/Product.js
module.exports = {
  attributes: {
    name:  { type: String, required: true },
    price: { type: Number, default: 0 },
    tags:  { type: [String] }
  },

  // Lifecycle hooks
  beforeSave(next) {
    this.updatedAt = new Date();
    next();
  }
};
```

Every model automatically gets `active`, `createdAt`, and `updatedAt` fields.
Models use [`mongoose-paginate-v2`](https://github.com/aravindnc/mongoose-paginate-v2) for pagination.

---

## Built-in Global Libs

All files in `vulkano/services/` are auto-loaded as globals. The framework also exposes:

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

Configure in `vulkano/config/express/jwt.js`:

```js
module.exports = {
  secret: process.env.JWT_SECRET,
  unless: ['/auth/login', '/health']   // Public paths (no token required)
};
```

Sign a token anywhere in your app:

```js
const token = Jwt.encode({ userId: user._id });
```

---

## Cron Jobs

```js
// vulkano/services/Jobs.js
module.exports = {
  init() {
    Crontab.add('cleanup', '0 3 * * *', async () => {
      await Report.deleteMany({ active: false });
    });
  }
};
```

---

## i18n

Translation files go in `vulkano/config/locales/`. Use `i18n.t('key')` anywhere in your app.

---

## Socket.io

Enabled via `vulkano/config/settings.js`. Adapters for MongoDB and Redis are included out of the box.

---

## Configuration — `vulkano/config/settings.js`

```js
module.exports = {

  // PORT to listen on
  port: process.env.PORT || 3000,

  // Salt for password
  salt: process.env.SALT_KEY || '',

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
