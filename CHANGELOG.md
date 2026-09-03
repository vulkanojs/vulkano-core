# Changelog

All notable changes to `@vulkano/core` are documented here.

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
