/**
 * Error pages in production (NODE_ENV=production) — an unmatched URL must
 * render the app's _shared/errors/404.html with a 404 status (not a 500),
 * while a thrown exception still renders 500.html.
 */

const engines = [
  {
    name: 'Nunjucks',
    baseUrl: () => process.env.TEST_SERVER_PROD_URL,
    okPath: '/nunjucks',
    throwPath: '/nunjucks/throw'
  },
  {
    name: 'Handlebars',
    baseUrl: () => process.env.TEST_SERVER_PROD_HBS_URL,
    okPath: '/handlebars',
    throwPath: '/handlebars/throw'
  }
];

describe.each(engines)('Production error pages ($name)', ({ baseUrl, okPath, throwPath }) => {

  it.each(['/nope', '/admin/nope', '/api/nope', '/nope.css'])(
    'GET %s returns 404 with the app 404 view',
    async (route) => {
      const res = await fetch(`${baseUrl()}${route}`);
      expect(res.status).toBe(404);
      expect(await res.text()).toContain('404 Not Found');
    }
  );

  it('existing route keeps working', async () => {
    const res = await fetch(`${baseUrl()}${okPath}`);
    expect(res.status).toBe(200);
  });

  it('an exception thrown in a controller still returns 500 with the app 500 view', async () => {
    const res = await fetch(`${baseUrl()}${throwPath}`);
    expect(res.status).toBe(500);
    expect(await res.text()).toContain('500 Server Error');
  });

});
