/**
 * Views — Handlebars engine
 */

describe('Views (Handlebars) — variable flow across layout / view / partial', () => {

  let html;

  beforeAll(async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    html = await res.text();
  });

  it('layout (default.html) receives and prints pageTitle', () => {
    expect(html).toContain('<title>My App</title>');
  });

  it('view (home/index.html) receives and prints heading', () => {
    expect(html).toContain('<h1 class="view-heading">Welcome</h1>');
  });

  it('partial (footer.html) receives and prints footerText', () => {
    expect(html).toContain('<footer class="site-footer">Vulkano HBS</footer>');
  });

  it('all three layers are present in the same response', () => {
    expect(html).toContain('<title>My App</title>');
    expect(html).toContain('<h1 class="view-heading">Welcome</h1>');
    expect(html).toContain('<footer class="site-footer">Vulkano HBS</footer>');
  });

});

describe('Views (Handlebars) — res.render()', () => {

  it('GET /home renders and returns 200', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    expect(res.status).toBe(200);
  });

  it('GET /home Content-Type is text/html', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
  });

  it('filter-style helper (positional arg) — {{upper value}}', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home`);
    const h = await res.text();
    expect(h).toContain('WELCOME');
  });

  it('GET /home/layout renders using default layout automatically', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home/layout`);
    expect(res.status).toBe(200);
    const h = await res.text();
    expect(h).toContain('<title>Layout Test</title>');
    expect(h).toContain('<div id="app">');
    expect(h).toContain('Rendered inside layout');
  });

});

describe('Views (Handlebars) — 404 error pages', () => {

  it('GET unknown controller renders no_controller.html with controller name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/nonexistent`);
    expect(res.status).toBe(404);
    const h = await res.text();
    expect(h).toContain('Controller Not Found');
    expect(h).toContain('nonexistent');
  });

  it('GET unknown action renders no_action.html with action name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home/badaction`);
    expect(res.status).toBe(404);
    const h = await res.text();
    expect(h).toContain('Action Not Found');
    expect(h).toContain('badaction');
  });

});

describe('Views (Handlebars) — 500 error page', () => {

  it('GET /home/throw renders exception.html with status code', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_HBS_URL}/home/throw`);
    expect(res.status).toBe(500);
    const h = await res.text();
    expect(h).toContain('Internal Error');
    expect(h).toContain('500');
  });

});
