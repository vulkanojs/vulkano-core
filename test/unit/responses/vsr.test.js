/**
 * responses/vsr.js — unit tests
 */

const vsr = require('../../../responses/vsr');

function run(promise) {
  global.app = { PRODUCTION: false };
  return new Promise((resolve) => {
    const res = {
      headersSent: false,
      status: (code) => ({ jsonp: (body) => resolve({ code, body }) })
    };
    vsr.call({ req: { res } }, promise);
  });
}

describe('vsr', () => {

  it('resolves null as 200 with data null (no crash)', async () => {
    const { code, body } = await run(Promise.resolve(null));
    expect(code).toBe(200);
    expect(body).toEqual({ success: true, statusCode: 200, data: null });
  });

});
