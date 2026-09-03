# Changelog

All notable changes to `@vulkano/core` are documented here.

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
