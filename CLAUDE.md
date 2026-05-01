# Vulkano Core — CLAUDE.md

## Descripción

`@vulkano/core` (v1.15.6) es el motor del framework MVC Vulkano. Carga el entorno, conecta la base de datos, registra modelos/controladores/servicios y levanta el servidor Express. La app del usuario solo hace `require('@vulkano/core')` y llama a la función exportada.

---

## Estructura de archivos

```
core/
├── app.js                        ← Entry point: bootstrap completo
├── bootstrap/
│   ├── express.js                ← Fusiona toda la config de Express
│   ├── logger.js                 ← Helpers de consola (colores, columnas)
│   ├── responses.js              ← Inyecta res.vsr() y custom responses en Express
│   ├── server.js                 ← Levanta Express, middleware, rutas, sockets
│   ├── services.js               ← Inyecta libs/services en global scope
│   └── views.js                  ← Config base de Nunjucks (path, filtros, helpers)
├── controllers/
│   ├── controllers.js            ← Auto-descubre controllers y genera tabla de rutas
│   └── ScaffoldController.js     ← CRUD automático para controllers con scaffold=true
├── database/
│   ├── mongodb.js                ← Conecta Mongoose, compila modelos, los pone en global
│   ├── models.js                 ← Carga modelos del usuario, mezcla callbacks y scaffold
│   └── scaffold.js               ← Métodos CRUD base: getAll, getByField, create, update, delete, subdocs
├── libs/
│   ├── ApiClient.js              ← Wrapper de Axios para HTTP saliente
│   ├── Crontab.js                ← Wrapper de node-cron para tareas programadas
│   ├── Download.js               ← Descarga de archivos
│   ├── Encrypter.js              ← AES-256-CBC encrypt/decrypt
│   ├── Filter.js                 ← Sistema de filtros de string (trim, prefix, etc.)
│   ├── Jwt.js                    ← Encode/decode JWT + middleware Express
│   ├── Paginate.js               ← Paginación, búsqueda y filtrado sobre Mongoose
│   ├── VSError.js                ← Clase de error estándar con statusCode
│   ├── i18n.js                   ← Wrapper de i18next + moment locale
│   └── filters/                  ← Filtros individuales (trim, ltrim, rtrim, prefix, suffix, number, objectId, saveinteger)
├── responses/
│   └── vsr.js                    ← Vulkano Standard Response: resuelve promesa → JSON
└── views/
    ├── filters/                  ← Filtros Nunjucks del core (vCamelCase, vLowercase)
    └── errors/                   ← Templates HTML de error en desarrollo (no_controller, no_action, no_view, exception)
```

---

## Flujo de bootstrap (`app.js`)

1. Fija globals: `START_TIME`, `ABS_PATH`, `APP_PATH`, `PUBLIC_PATH`, `CORE_PATH`, `app`, `_`
2. Carga `.env` con dotenv
3. Auto-descubre toda la config del usuario via `include-all` desde `app/config/`
4. Fusiona config en orden: general → settings → env/{NODE_ENV} → local.js
5. Guarda resultado en `app.config`
6. Ejecuta en secuencia: `loadServices()` → `loadDatabase()` → `loadControllers()` → `loadServer()`
7. Registra `app.routes` y `app.server`
8. Llama a `bootstrap.js` del usuario, que a su vez llama a `app.server.start(cb)`
9. Dentro del start: registra middleware, rutas, sockets, y finalmente ejecuta `cb()`

---

## Globals disponibles en toda la app

Estos se definen automáticamente y están disponibles sin import:

| Global | Origen | Qué es |
|---|---|---|
| `app` | `app.js` | Config, server, rutas, pkg |
| `app.config` | `app.js` | Toda la config mergeada |
| `app.vulkano` | `server.js` | Instancia de Express |
| `app.server` | `server.js` | HTTP server de Node |
| `app.redisClient` | `server.js` | Cliente Redis (si enabled) |
| `app.nunjucks` | `server.js` | Instancia de Nunjucks |
| `app.socket` | `server.js` | Socket.io socket actual |
| `io` | `server.js` | Instancia global de Socket.io |
| `mongoose` | `mongodb.js` | Instancia de Mongoose |
| `Virtual` | `mongodb.js` | Marcador `'Virtual'` para campos virtuales |
| `Mixed` | `mongodb.js` | `mongoose.Schema.Types.Mixed` |
| `[ModelName]` | `mongodb.js` | Cada modelo compilado (ej: `User`, `Product`) |
| `Filter` | `services.js` | Lib de filtros de string |
| `Paginate` | `services.js` | Lib de paginación |
| `VSError` | `services.js` | Clase de error estándar |
| `Jwt` | `services.js` | Lib de JWT |
| `Encrypter` | `services.js` | Lib de cifrado AES |
| `ApiClient` | `services.js` | Cliente HTTP saliente |
| `Crontab` | `services.js` | Wrapper de cron jobs |
| `i18n` | `services.js` | Instancia de i18next |
| `_` | `app.js` | Underscore.js |

Todo lo que está en `core/libs/*.js` y `app/services/*.js` y `app/libs/*.js` se inyecta automáticamente en global scope por `bootstrap/services.js`.

---

## Sistema de rutas

### Convención por nombre de método (auto-routing)

`controllers/controllers.js` lee todos los archivos `*Controller.js` y genera rutas a partir de los nombres de los métodos:

```js
// HomeController.js
module.exports = {
  get(req, res) { ... },           // → GET /home/
  'post save'(req, res) { ... },   // → POST /home/save
  'get :id'(req, res) { ... },     // → GET /home/:id
  '/absolute/path'(req, res) { ... } // → GET /absolute/path (ruta absoluta)
}
```

**Reglas de parseo:**
- Si la clave tiene espacio: `'METHOD action'` → `[method, path]`
- Si la clave es solo un método HTTP (`get`, `post`, `put`, `delete`) → ruta raíz del controller
- Si la clave empieza con `/` → se usa como ruta absoluta
- Si hay un subfolder (ej: `api/TestController`) → ruta es `/{folder}/{controller}/{action}`

### Rutas explícitas (`app/config/routes.js`)

```js
module.exports = {
  'GET /': 'HomeController.get',
  'POST /api/users': 'api.UserController.create',
  '/about': 'HomeController.about',             // asume GET
  '/handler': (req, res) => res.send('ok')      // función directa
}
```

### Limitaciones conocidas del sistema de rutas
- Solo soporta métodos: `get`, `post`, `put`, `delete`. No hay `patch`, `head`, `options`.
- El parseo es por `split(' ')` — frágil con espacios extras.
- No valida que el controller/action existan antes de registrar (falla en runtime con `console.error`).
- Los conflictos entre rutas se resuelven por orden de registro (primero gana).

---

## Modelos

### Definición

```js
// app/models/User.js
module.exports = {
  attributes: {
    name: { type: String, required: true },
    email: { type: String },
    age: { type: Number },
    bio: { type: String, type: 'Virtual', get() { return '...' } }
  },
  indexes: [{ email: 1 }],
  plugins: [],
  beforeSave(next) { next(); },
  afterSave() {}
}
```

**Campos automáticos** (siempre presentes):
- `active: Boolean` (default: `true`) — soft delete flag
- `createdAt: Date` (default: `Date.now`)
- `updatedAt: Date`

**trim automático:** Todos los atributos no-Boolean tienen `trim: true` por defecto. Para desactivarlo: `{ type: String, trim: false }`.

### Métodos de scaffold disponibles en cada modelo

```js
Model.getAll(props)                          // paginación
Model.getByField(value, field?)              // por _id o campo custom
Model.create(data)                           // crear
Model.update(id, data)                       // merge + actualizar
Model.delete(id)                             // soft delete (active: false)
Model.createSubdoc(key, parentId, data)
Model.updateSubdoc(key, parentId, subdocId, data)
Model.removeSubdoc(key, parentId, subdocId)
Model.deleteSubdoc(...)                      // alias de removeSubdoc
```

También se generan automáticamente:
```js
Model.getAllUser(props)   // alias de getAll
Model.getUser(id)        // alias de getByField
```

---

## ScaffoldController

Si un controller tiene `scaffold: true` y `model: 'ModelName'`, se generan automáticamente los 5 métodos CRUD:

```js
module.exports = {
  scaffold: true,
  model: 'User',
  allowedMethods: ['get', 'post', 'put']  // opcional, restringe métodos
}
```

Genera: `GET /user/`, `GET /user/:id`, `POST /user`, `PUT /user/:id`, `DELETE /user/:id`

**Importante:** El scaffold no tiene ningún middleware de autenticación por defecto.

---

## VSR — Vulkano Standard Response

`res.vsr(promise, statusCode?)` es el método principal para responder en controladores.

```js
get(req, res) {
  res.vsr(User.getAll(req.query));          // 200
  res.vsr(User.create(req.body), 201);      // 201
}
```

- Recibe una **Promise** (si no es Promise, responde 500)
- En `.then()`: responde `{ success: true, statusCode, data: result }`
- En `.catch()`: responde `{ success: false, statusCode, error: { detail, errorCode, errorName } }`
- `.finally()`: siempre ejecuta `res.status(code).jsonp(output)`

---

## VSError

```js
VSError.reject('Not allowed', 403)      // Promise.reject con VSError
VSError.notFound('User')                // Promise.reject con 404
new VSError('mensaje', 500, props)      // instancia directa
```

---

## Paginate

```js
// En un modelo o controller
Paginate.get(Model, query, populate?)
Paginate.serializeQuery(defaultProps, requestQuery)
```

**Query params soportados:** `page`, `per_page`, `search`, `sort` (ej: `createdAt|DESC`), `fields`, `searchType` (contains/startwith/endwith)

**Respuesta de `_set()`:**
```js
{ items, cursor, page, perPage, next, prev, totalPages, totalItems }
```

---

## JWT (Jwt.js)

```js
Jwt.encode(data)          // encripta con AES + codifica JWT
Jwt.decode(token)         // decodifica y verifica expiración
Jwt.getToken(req)         // extrae token de header/cookie/query
Jwt.socket(socket)        // extrae token del handshake de Socket.io
Jwt.init(opts)            // retorna middleware express-jwt
```

El token incluye expiración. Si no tiene campo `expiration`, se rechaza (a menos que `config.jwt.expiration === false`).

---

## Config — jerarquía de merge

```
app/config/*.js          (config general)
app/config/env/{NODE_ENV}/*.js  (por entorno)
app/config/local.js      (overrides locales, no commitear)
```

Todos se fusionan con `deepmerge`. La config final queda en `app.config`.

**Archivos de config más importantes:**
- `settings.js` — puerto, base de datos, paths
- `express/cors.js`, `express/jwt.js`, `express/csp.js`, `express/cookies.js`
- `routes.js` — rutas explícitas
- `bootstrap.js` — hook de inicio (requerido)
- `sockets/` — config de Socket.io y adapters

---

## Sockets (Socket.io)

Habilitado con `config.sockets.enabled: true`. Soporta adapters: `memory` (default), `redis`, `mongodb`.

**Eventos:**
```js
// app/config/sockets/events.js o routes
module.exports = {
  'message': 'ChatController.message',
  'join': (socket, body, callback) => { ... }
}
```

El handler recibe `({ socket, body }, callback)`.

Socket global disponible como `io` e `app.socket`.

---

## Errores conocidos / deuda técnica

- **`mongodb.js:48`** — `throw \`string\`` en vez de `throw new Error()`. Crashea el proceso pero sin stack trace útil.
- **`server.js:603`** — `Filter.get(req.path, 'trim', '/')` se llama en el handler 404, pero `Filter` puede no estar disponible si services no cargó. Dependencia implícita.
- **`vsr.js:24`** — Si se pasa algo que no es Promise, responde 500 silenciosamente con `console.log`. No lanza error.
- **`vsr.js:71`** — `e.message` puede ser un objeto, lo cual provoca `[object Object]` en el error response.
- **`server.js:673`** — Detección de error de template por `err.stack.indexOf('template not found')` — muy frágil.
- **`Paginate.js:81-85`** — El input de búsqueda del usuario se inserta directamente en RegExp sin escapar caracteres especiales. Posible ReDoS con inputs como `(((`.
- **`services.js`** — Todo se inyecta en `global`. Imposible hacer unit tests sin mockear globals.
- **`bluebird`** — Usado como Promise polyfill. No necesario en Node 18+.
- **`path` y `fs` como dependencias npm** — Son módulos nativos de Node; no deberían estar en `package.json`.

---

## Convenciones del proyecto

- Archivos de controller: `{Name}Controller.js`
- Archivos de modelo: `{Name}.js` (PascalCase)
- Archivos de servicio/lib: `{Name}.js` (PascalCase, van a global con ese nombre)
- Config: camelCase, un concepto por archivo en su subcarpeta correspondiente
- Respuestas de API siempre via `res.vsr(promise)`
- Soft delete por `active: false`, nunca borrado físico por defecto
- No hay TypeScript, no hay tests automatizados en el core actualmente
