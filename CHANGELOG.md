# Changelog

All notable changes to `@vulkano/core` are documented here.

## [2.1.1]

### Fixed
- **`npm test` no longer hard-fails when `TEST_DB_URI` isn't set.** `test/global-setup.js`
  used to `throw` before any test ran if `core/.env.test` had no `TEST_DB_URI` — killing the
  entire run, including the `unit` project, which never touches a database.
  `jest.config.js` now loads `.env.test` and only adds the `integration` project (the one
  that spins up a real MongoDB) when `TEST_DB_URI` is present; otherwise it logs a warning
  and runs `unit` alone.
- **Redis client compat with `@redis/client` v6** (`bootstrap/server.js`, new
  `bootstrap/redisCompat.js`), affecting both `app.redisClient`
  (`app/config/redis.js`) and the Socket.io Redis adapter
  (`app/config/sockets/adapters/redis.js`):
  - **Flat `host`/`port` was silently ignored.** `@redis/client` v6's
    `createClient()` only ever reads `options.socket.host` /
    `options.socket.port` — confirmed by reading the installed
    `@redis/client@6.2.1` source (`RedisClient.parseOptions`,
    `RedisSocket`'s `#createSocketFactory`). A flat `{ host, port }` at the
    config root — which is exactly Vulkano's own documented shape, shipped
    in every `app/config/redis.js` template and in the README — was never
    read, so the client silently fell back to `localhost:6379` no matter
    what the app configured. Both call sites now normalize `host`/`port`
    under `socket` right before `createClient()`; the app-facing config
    shape (`host`/`port`/`password`) is unchanged.
  - **`HELLO` broke every Redis <6.0 server.** `@redis/client` v6 defaults
    to the RESP3 handshake and sends `HELLO` unconditionally
    (`DEFAULT_RESP = 3`, read in `#getHandshakeCommands()`) — Redis added
    `HELLO` in 6.0, so any older server rejects it with
    `ERR unknown command 'HELLO'` and the connection never completes.
    Connecting now auto-retries once with the classic RESP2/AUTH handshake
    (`RESP: 2`) when that specific error is detected, so a project talking
    to Redis <6.0 doesn't need to know about RESP versions or set anything
    itself.
  - The Socket.io Redis adapter's `pubClient`/`subClient` are now connected
    *before* `io.adapter(...)` is wired up (previously connected afterwards,
    unawaited, via a `Promise.all` that is now a no-op) — this also matches
    `@socket.io/redis-adapter`'s own documented connect-then-adapter order.

### Tests
- `test/unit/bootstrap/redisCompat.test.js` (new) — `normalizeRedisOptions`
  (flat → nested `socket`, nested takes precedence, url-based config
  untouched), `isMissingHelloError`, and `connectRedisClient` (normalizes
  + connects, propagates a real connection error without retrying, retries
  exactly once with `RESP: 2` on a missing-`HELLO` error, doesn't loop a
  second time if `RESP: 2` was already set).

## [2.0.0]

**This is the start of the v2.x line, built on Express 5.** Existing Express 4 projects that
aren't ready to upgrade should stay on the `1.x` branch (maintenance fixes only, no new
features from this point on).

### Changed
- **Requires Node.js `>=24`** (was `>=20`).
- **Bumped `mongoose` to `^9.9.5`** (was `^8.12.1`). Mongoose 9 stopped passing a `next` callback
  to `pre` middleware — it now calls hooks with zero arguments and expects a synchronous function
  or one returning a Promise, so Vulkano's own hook convention (every `beforeSave`/`beforeUpdate`/
  `beforeFindOneAndUpdate`/`beforeRemove`/`beforeValidate` written as `(next) => { ...; next(); }`,
  in `database/models.js`'s defaults and in every model that defines its own) would otherwise
  crash with `TypeError: next is not a function` on save/update/validate/remove — verified this
  directly against the installed mongoose@9 before writing the fix. `database/mongodb.js` now
  wraps any such `(next)`-style hook into a Promise-returning function Mongoose 9 accepts, so
  existing models — in this framework and in consuming apps — keep working unchanged; a hook
  already written with zero parameters (already Promise/async-style) passes through untouched.
  Post-hooks (`afterSave(doc, cb)`, etc.) needed no change — confirmed Mongoose 9 still calls
  them with a real callback, unlike pre-hooks. Also switched `database/scaffold.js`'s
  `findOneAndUpdate(..., { new: true })` to the non-deprecated `{ returnDocument: 'after' }` (the
  old option still worked, just logged a deprecation warning on every update).
- Bumped `undici` to `^8.10.2` (was `^7.28.0`) and `vite-plus` to `^0.3.1` (was `^0.3.0`) — no
  code changes needed for either; `libs/ApiClient.js`'s narrow `Agent`/`fetch` usage is
  unaffected by undici 8's breaking changes (HTTP/2-by-default, legacy handler wrapper removal,
  stricter Blob validation — none apply here).
- Migrated from Express 4 to Express 5 (`^5.2.1`), used natively — **no compatibility layer
  restoring old Express 4 API** (`req.param()`, legacy `res.send/json/jsonp` two-argument forms,
  `res.redirect`'s old argument order, `res.redirect('back')`, etc.), and **the query-string
  parser is Express 5's native `'simple'` default**, not forced back to `'extended'` — verified
  `Paginate.serializeQuery()` only reads flat top-level query keys and never a `filter` key, so
  the nested-bracket parser wasn't protecting anything Vulkano's own scaffold relies on. If your
  app's own code calls the old `res.*`/`req.param()` APIs directly, or needs nested query
  objects for something of its own outside Paginate, update/configure it explicitly (see the
  README's "Express 5" section). One Vulkano-owned routing convention DOES carry over as a
  permanent framework default, not app-code compat: the wildcard/optional-param route translator
  (`'/admin*'`, bare `'*'`/`'/*'`, and legacy `':id?'` routes all still work, translated
  internally to path-to-regexp v8 syntax via `bootstrap/routeCompat.js`).

### Added
- `database/scaffold.js`: new `getSubdoc(key, parent, subdoc)` — finds a single subdocument by id
  (404 if the parent or the subdocument doesn't exist), alongside the existing `createSubdoc`/
  `updateSubdoc`/`removeSubdoc`. Verified end-to-end through both a hand-written controller
  (`ItemController`'s `comments`) and, for the first time, a `scaffold: true` controller with
  extra subdoc routes layered on top (`ExampleController`'s new `lines` field) — confirmed live
  via curl: `POST /api/example/:id/lines`, `GET /api/example/:id/lines/:lineId`,
  `PUT /api/example/:id/lines/:lineId`, plus `GET /api/example/:id` showing the parent's `lines`
  array.
- **`ScaffoldController` now supports subdocuments generically**, opt-in via a `subdocs` array
  (`scaffold: 'Product', subdocs: ['reviews']`) — same on/off convention as `allowedMethods`.
  Generates `POST/GET/PUT/DELETE /api/products/:id/:key(/:subId)` wired to
  `createSubdoc`/`getSubdoc`/`updateSubdoc`/`removeSubdoc`; `GET .../:id/:key` with no `subId`
  lists every item under that key. `:key` is restricted to the `subdocs` allowlist — an
  unlisted key (including a real but non-array field) 404s rather than reaching
  `Model.createSubdoc()` and blowing up. `controllers/controllers.js` now extracts `subdocs`
  from the controller definition and passes it through as a third argument. Verified live via
  curl on a bare scaffold controller (`SchoolController` + a new `grades` field) with no
  hand-written subdoc code at all.
- `res.vsr()` now also accepts a function (async or plain) instead of only a Promise —
  `res.vsr(async () => { ... })` — so async/await controllers don't need an explicit
  `try`/`catch`. A thrown error or an awaited rejection inside the function both funnel into
  VSR's existing `.catch()` the same way a rejected Promise does. See README's "Responses"
  section.

### Fixed
- **Guarded against a soft-delete filter bypass**: confirmed (and pinned with a regression
  test) that a `filter` key in the raw request query — e.g. `?filter[active]=false` — can never
  override a model's own hardcoded `filter` default in `Paginate.serializeQuery()`. Verified
  live under both `'simple'` (Express 5 default, where the bracket key doesn't even parse into
  an object) and `'extended'` (where it does parse into an object, but is still never read).
  Documented the safe pattern for custom `getAll(props)` overrides in the README.
- Fixed `database/scaffold.js`'s `update()` and its mirrored pattern in `examples/models/Example.js`
  / `test/fixtures/app/models/Item.js` to use `{ returnDocument: 'after' }` instead of the
  deprecated `{ new: true }` (see Mongoose bump above).

### Tests
- `test/unit/controllers/ScaffoldController.test.js` — new cases for the generic `subdocs`
  feature (on/off, route generation, delegation to each Model.*Subdoc method, 404 on an
  unlisted `:key`).
- `test/integration/scaffold-subdoc.test.js` (new) — `getSubdoc` + the existing subdoc methods
  through a hand-wired `scaffold: true` controller (`ExampleController`'s `lines`).
- `test/integration/scaffold-generic-subdoc.test.js` (new) — the fully generic `subdocs: [...]`
  path end-to-end (`SchoolController`'s `grades`, zero hand-written subdoc code).
- `test/unit/database/mongodb.test.js` — new cases for the Mongoose 9 pre-hook compatibility
  wrapper (zero-arg passthrough, argument-ignoring, async delay respected, `next(err)` rejection,
  `this` preserved). Existing `test/integration/hooks.test.js` (hook firing order) and
  `test/integration/subdoc.test.js` (subdocument CRUD) both re-verified green against Mongoose 9,
  the latter also confirmed live via curl (create → update → verify → remove → confirm gone).
- `test/unit/bootstrap/routeCompat.test.js` (new).
- `test/unit/libs/Paginate.test.js` — new case locking down the filter-bypass guard above.
- `test/integration/vsr.test.js` — new cases for the async-function `res.vsr()` support.
- `test/integration/security-middleware.test.js` (new) — JWT (401/200), rate limiting (429 past
  the fixture's 3/min limit), and session-cookie persistence, run against a new "secured"
  fixture server variant (`TEST_ENABLE_SECURITY=1`, see `test/global-setup.js`) that actually
  enables JWT/rate-limit/cookies/session — previously `enabled: false` everywhere and never
  exercised at runtime. All three additionally confirmed live via curl against a manually
  booted server.

## [1.30.1]

### Fixed
- `database/mongodb.js` — registered `error`/`disconnected` listeners on `mongoose.connection`
  before connecting. Node throws an uncaught exception on an EventEmitter `'error'` event with
  no listener — a MongoDB connection drop after the initial connect (network blip, DB restart)
  was crashing the entire process instead of just failing the queries in flight. Guarded against
  duplicate registration if the loader is invoked more than once in the same process.

### Tests
- `test/unit/database/mongodb.test.js` — listeners registered before connect, no duplicate
  registration on a second call, and emitting `'error'` on the connection no longer throws.

## [1.30.0]

### Added
- `bootstrap/express.js` — default multer `limits.fileSize` of **25MB**. Previously unbounded:
  an upload could buffer to disk in full before `Upload.js`'s own `maxSize` check ever ran,
  a real DoS surface (disk/memory/bandwidth) for any controller receiving uploads without an
  explicit limit. Override via `app/config/express/multer.js` (`limits.fileSize`) — deep-merges,
  doesn't drop the existing `fieldNestingDepth: 5` default.

### Tests
- `test/unit/bootstrap/express.test.js` — default `fileSize`, override, and that
  `fieldNestingDepth` survives a partial `limits` override (deep merge).

### Docs
- `README.md` / `AGENTS.md`: documented the default and the override path.

## [1.29.0]

### Changed — BREAKING (default behavior)
- `Crontab.schedule()` default `timeZone` is now `UTC`, was `America/New_York`. Any job that
  relied on the implicit New York default without passing `timeZone` explicitly now runs on a
  different schedule relative to wall-clock time in that zone — pass `timeZone: 'America/New_York'`
  explicitly to keep the old behavior. A job with an explicit `timeZone` is unaffected.

### Tests
- `test/unit/libs/Crontab.test.js` — default/override timezone, `start: true/false`, manual tick.

### Docs
- `AGENTS.md` / `README.md`: documented the `UTC` default; removed the now-resolved
  `Crontab` timezone known-issue entry.

## [1.28.1]

### Changed (internal, no runtime/public API impact)
- `test/unit/` — added `test/unit/helpers/globals.js`, a shared `setupGlobals()` /
  `setupEncrypter()` / `setupFilter()` bootstrap for unit-testing a core lib in isolation.
  Replaces 4 duplicated, hand-rolled `VSError` stand-in classes across
  `ApiClient.test.js` / `Encrypter.test.js` / `Jwt.test.js` with the real `libs/VSError.js`,
  and a fragile `delete global.app` pattern in `Encrypter.test.js` with restoring the
  baseline via `setupGlobals()`.
- Removed two stale `Known issues / tech debt` entries from `AGENTS.md` (`bluebird` and
  `path`/`fs` as dependencies) — neither is present in the codebase or `package.json` anymore.

## [1.28.0]

### Changed
- `ApiClient` — SSL verification stays enabled (secure) by default, but the default itself can
  now be flipped app-wide via `.env` with `API_CLIENT_REJECT_UNAUTHORIZED=false` (e.g. same-server
  calls to other internal services on self-signed certs). A per-call `rejectUnauthorized` still
  always wins over the env default, in either direction.

### Tests
- Env-driven default, per-call override in both directions, and non-`"false"` values keeping
  verification on.

### Docs
- `AGENTS.md` / `README.md`: documented `API_CLIENT_REJECT_UNAUTHORIZED`; removed the stale
  "SSL disabled by default" known-issue entry and the outdated "Axios wrapper" description.

## [1.27.0]

### Added
- Global `View` lib — `View.render(view, data)` returns a Promise<html>, rendering a view
  outside the normal request/response cycle (email bodies, PDF generation, etc.), without
  the `req.app.render` boilerplate.

### Tests
- Nunjucks and Handlebars coverage for `View.render()`, verifying markup matches `res.render()`
  on the same template.

### Docs
- `AGENTS.md` / `README.md`: documented the `View` global.

## [1.26.0]

### Added
- Controllers support **arbitrary nesting depth** under `app/controllers/` (e.g.
  `api/config/VatTypesController.js` → `/api/config/vat-types/...`), not just one subfolder
  level — ideal for grouping controllers by module/domain. The route loader
  (`controllers/controllers.js`) now walks the folder tree recursively instead of handling
  a single hardcoded nesting level.

### Tests
- `test/integration/nested-modules.test.js` — same controller name (`VatTypesController`) at
  root, one, and two levels of nesting, all 5 CRUD methods, verifying full route isolation.

### Docs
- `AGENTS.md` / `README.md`: documented multi-level controller nesting.
