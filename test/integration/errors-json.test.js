/**
 * Errors for API clients — a request that sends JSON, or prefers JSON over HTML,
 * gets a JSON error instead of the HTML error page; and a JSON body that fails
 * to parse answers 400 even when JWT is enabled (its error handler used to drop
 * the error with a bare next(), so the route ran without res.vsr → 500).
 */

const servers = [
  { name: 'default', baseUrl: () => process.env.TEST_SERVER_URL },
  { name: 'secured (JWT on)', baseUrl: () => process.env.TEST_SERVER_SECURED_URL },
  { name: 'production', baseUrl: () => process.env.TEST_SERVER_PROD_URL }
];

describe.each(servers)('Malformed JSON body ($name)', ({ baseUrl }) => {

  it('POST /test/save with an invalid JSON body answers a 400 JSON error', async () => {
    const res = await fetch(`${baseUrl()}/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad json'
    });

    expect(res.status).toBe(400);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = await res.json();
    expect(body).toMatchObject({ success: false, statusCode: 400 });
  });

  it('a valid JSON body still reaches the controller', async () => {
    const res = await fetch(`${baseUrl()}/test/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual({ saved: true, received: { a: 1 } });
  });

});

describe('Exceptions for clients that prefer JSON', () => {

  it('production: a thrown exception answers JSON without the stack', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_PROD_URL}/nunjucks/throw`, {
      headers: { Accept: 'application/json' }
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ success: false, statusCode: 500 });
    expect(body.error.stack).toEqual({});
  });

  it('development: a browser (Accept: text/html) still gets the HTML exception page', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/nunjucks/throw`, {
      headers: { Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' }
    });

    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

});
