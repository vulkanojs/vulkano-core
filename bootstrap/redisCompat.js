/**
 * Internal Redis compatibility helpers for bootstrap/server.js.
 *
 * Not auto-loaded as a global (kept out of libs/ on purpose) — this is
 * bootstrap-only wiring, not part of the public API. app/config/redis.js
 * and app/config/sockets/adapters/redis.js keep their documented
 * host/port/password shape; everything below only massages that shape
 * right before it reaches @redis/client's createClient().
 */

const { createClient } = require('redis');

// @redis/client v6's RedisClient.parseOptions() only ever reads
// options.socket.host / options.socket.port (see
// node_modules/@redis/client/dist/lib/client/index.js and socket.js) — a
// flat { host, port } at the config root, which is exactly the shape
// documented in README.md and shipped in every app/config/redis.js
// template, is silently ignored and the client falls back to the
// localhost:6379 default. Move it under `socket` before it reaches
// createClient(), without touching the app-facing config shape.
function normalizeRedisOptions(config) {

  const { host, port, socket, ...rest } = config || {};

  if (host === undefined && port === undefined) {
    return config;
  }

  return {
    ...rest,
    socket: {
      host,
      port: port !== undefined ? Number(port) : undefined,
      ...socket
    }
  };

}

// Redis < 6.0 has no HELLO command — it's the RESP3 handshake command,
// added in Redis 6.0. @redis/client v6 defaults to RESP3 and sends HELLO
// unconditionally (DEFAULT_RESP = 3, see
// node_modules/@redis/client/dist/lib/RESP/types.js, read in
// #getHandshakeCommands()), so connecting to an older server fails
// immediately with this exact error.
function isMissingHelloError(err) {
  return /unknown command ['"]?hello/i.test(err?.message || '');
}

// Connects a Redis client, normalizing host/port first. If the server
// rejects HELLO (Redis <6.0), retries once with the classic RESP2/AUTH
// handshake — so a project talking to an older Redis never has to know
// about RESP versions.
async function connectRedisClient(config, onError) {

  const options = normalizeRedisOptions(config);

  const attempt = async (opts) => {
    const client = createClient(opts);
    if (onError) {
      client.on('error', onError);
    }
    await client.connect();
    return client;
  };

  try {
    return await attempt(options);
  } catch (err) {
    if (options.RESP === 2 || !isMissingHelloError(err)) {
      throw err;
    }
    return attempt({ ...options, RESP: 2 });
  }

}

module.exports = { normalizeRedisOptions, isMissingHelloError, connectRedisClient };
