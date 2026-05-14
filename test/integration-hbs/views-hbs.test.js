/**
 * Views — Handlebars engine
 */

describe('Views (Handlebars) — res.render()', () => {

  it('GET /home renders and returns 200', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    expect(res.status).toBe(200);
  });

  it('GET /home Content-Type is text/html', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
  });

  it('GET /home passes variables to the Handlebars template', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    const html = await res.text();
    expect(html).toContain('Handlebars Home');
    expect(html).toContain('vulkano');
  });

  it('filter-style helper (positional arg) renders correctly — {{upper username}}', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    const html = await res.text();
    expect(html).toContain('VULKANO');
  });

  it('hash-style helper (like Vite) renders HTML unescaped — {{{badge label=title color="green"}}}', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    const html = await res.text();
    expect(html).toContain('<span class="badge"');
    expect(html).toContain('Handlebars Home');
  });

});

describe('Views (Handlebars) — 404 error pages', () => {

  it('GET unknown controller renders no_controller.html with controller name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/nonexistent`);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Controller Not Found');
    expect(html).toContain('nonexistent');
  });

  it('GET unknown action renders no_action.html with action name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home/badaction`);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Action Not Found');
    expect(html).toContain('badaction');
  });

});

describe('Views (Handlebars) — 500 error page', () => {

  it('GET /home/throw renders exception.html with status code', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home/throw`);
    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain('Internal Error');
    expect(html).toContain('500');
  });

});
