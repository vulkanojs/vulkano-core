/**
 * Minimal fetch-based HTTP client for integration tests.
 * Mirrors the axios.create({ baseURL, validateStatus: () => true }) pattern:
 * always resolves (never throws on 4xx/5xx), returns { status, data }.
 */

module.exports = function createClient(baseURL) {

  async function request(method, path, body) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${baseURL}${path}`, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  return {
    get:    (path)        => request('GET',    path),
    post:   (path, body)  => request('POST',   path, body),
    put:    (path, body)  => request('PUT',    path, body),
    patch:  (path, body)  => request('PATCH',  path, body),
    delete: (path)        => request('DELETE', path)
  };

};
