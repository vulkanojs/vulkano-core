/**
 * bootstrap/express.js — unit tests
 * Focuses on the multer file-size default and its override, without
 * spinning up a server.
 */

const { setupGlobals } = require('../helpers/globals');

function loadConfig(overrides = {}) {
  jest.resetModules();
  setupGlobals({ app: { config: overrides } });
  return require('../../../bootstrap/express')();
}

describe('getExpressConfiguration — multer.limits.fileSize', () => {

  it('defaults to 25MB when no override is given', () => {
    const config = loadConfig();
    expect(config.multer.limits.fileSize).toBe(25 * 1024 * 1024);
  });

  it('keeps the fieldNestingDepth default alongside the fileSize default', () => {
    const config = loadConfig();
    expect(config.multer.limits.fieldNestingDepth).toBe(5);
  });

  it('a project override (app/config/express/multer.js) replaces the default fileSize', () => {
    const config = loadConfig({
      express: {
        multer: {
          limits: { fileSize: 1024 }
        }
      }
    });
    expect(config.multer.limits.fileSize).toBe(1024);
  });

  it('a project fileSize override does not drop the fieldNestingDepth default (deep merge)', () => {
    const config = loadConfig({
      express: {
        multer: {
          limits: { fileSize: 1024 }
        }
      }
    });
    expect(config.multer.limits.fieldNestingDepth).toBe(5);
  });

});
