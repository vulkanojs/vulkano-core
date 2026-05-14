/**
 * Views
 * Tests: res.render() renders Nunjucks templates and returns HTML
 */

describe('Views — res.render()', () => {

  it('GET /home — renders home/index.html and returns 200', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    expect(res.status).toBe(200);
  });

  it('GET /home — response Content-Type is text/html', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
  });

  it('GET /home — HTML body contains "Welcome to VulkanoJS"', async () => {
    const res = await fetch(`${process.env.TEST_SERVER_URL}/home`);
    const html = await res.text();
    expect(html).toContain('Welcome to VulkanoJS');
  });

});
