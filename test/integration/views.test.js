/**
 * Views — Nunjucks engine
 */

describe('Views (Nunjucks) — res.render()', () => {

  it('GET /home renders and returns 200', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    expect(res.status).toBe(200);
  });

  it('GET /home Content-Type is text/html', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
  });

  it('GET /home HTML body contains "Welcome to VulkanoJS"', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    const html = await res.text();
    expect(html).toContain('Welcome to VulkanoJS');
  });

  it('GET /home/vars passes variables to the Nunjucks template', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home/vars`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('Test Title');
    expect(html).toContain('vulkano');
  });

});

describe('Views (Nunjucks) — variable flow across layout / view / partial', () => {

  let html;

  beforeAll(async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home/three-vars`);
    html = await res.text();
  });

  it('layout (default.html) receives and prints pageTitle', () => {
    expect(html).toContain('<title>My App</title>');
  });

  it('view (three-vars.html) receives and prints heading', () => {
    expect(html).toContain('<h1 class="view-heading">Welcome</h1>');
  });

  it('partial (footer.html) receives and prints footerText', () => {
    expect(html).toContain('<footer class="site-footer">Vulkano NJK</footer>');
  });

  it('all three layers are present in the same response', () => {
    expect(html).toContain('<title>My App</title>');
    expect(html).toContain('<h1 class="view-heading">Welcome</h1>');
    expect(html).toContain('<footer class="site-footer">Vulkano NJK</footer>');
  });

});

describe('Views (Nunjucks) — 404 error pages', () => {

  it('GET unknown controller renders no_controller.html with controller name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/nonexistent`);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Controller Not Found');
    expect(html).toContain('nonexistent');
  });

  it('GET unknown action renders no_action.html with action name', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home/badaction`);
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Action Not Found');
    expect(html).toContain('badaction');
  });

});

describe('Views (Nunjucks) — 500 error page', () => {

  it('GET /home/throw renders exception.html with status code', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home/throw`);
    expect(res.status).toBe(500);
    const html = await res.text();
    expect(html).toContain('Internal Error');
    expect(html).toContain('500');
  });

});
