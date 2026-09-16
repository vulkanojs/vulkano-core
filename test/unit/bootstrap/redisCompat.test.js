/**
 * redisCompat — unit tests.
 *
 * Covers the two @redis/client v6 compat gaps found while wiring
 * bootstrap/server.js's Redis client and socket adapter:
 *  1. A flat { host, port } (Vulkano's documented app/config/redis.js shape)
 *     is silently ignored by createClient() unless nested under `socket`.
 *  2. @redis/client v6 defaults to RESP3 and sends HELLO unconditionally,
 *     which Redis <6.0 doesn't understand.
 */

function mockClient(overrides) {
  return {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe('normalizeRedisOptions', () => {

  let normalizeRedisOptions;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('redis', () => ({ createClient: jest.fn() }));
    ({ normalizeRedisOptions } = require('../../../bootstrap/redisCompat'));
  });

  test('moves a flat host/port under socket', () => {
    expect(normalizeRedisOptions({ host: '10.0.0.5', port: '6380' })).toEqual({
      socket: { host: '10.0.0.5', port: 6380 }
    });
  });

  test('keeps other top-level keys (e.g. password) untouched', () => {
    expect(normalizeRedisOptions({ host: 'localhost', port: '6379', password: 'secret' })).toEqual({
      password: 'secret',
      socket: { host: 'localhost', port: 6379 }
    });
  });

  test('an existing nested socket.host/port wins over the flat root values', () => {
    expect(
      normalizeRedisOptions({ host: 'flat-host', port: '1111', socket: { host: 'nested-host' } })
    ).toEqual({
      socket: { host: 'nested-host', port: 1111 }
    });
  });

  test('config with no host/port at all is returned unchanged (e.g. url-based config)', () => {
    const config = { url: 'redis://localhost:6379' };
    expect(normalizeRedisOptions(config)).toBe(config);
  });

  test('nullish config is returned unchanged', () => {
    expect(normalizeRedisOptions(undefined)).toBe(undefined);
  });

});

describe('isMissingHelloError', () => {

  let isMissingHelloError;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('redis', () => ({ createClient: jest.fn() }));
    ({ isMissingHelloError } = require('../../../bootstrap/redisCompat'));
  });

  test('matches the exact error Redis <6.0 sends back for HELLO', () => {
    expect(isMissingHelloError(new Error("ERR unknown command 'HELLO'"))).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(isMissingHelloError(new Error('ERR unknown command HELLO'))).toBe(true);
  });

  test('does not match an unrelated connection error', () => {
    expect(isMissingHelloError(new Error('connect ECONNREFUSED 127.0.0.1:6379'))).toBe(false);
  });

  test('handles an error with no message safely', () => {
    expect(isMissingHelloError({})).toBe(false);
  });

});

describe('connectRedisClient', () => {

  let createClient;
  let connectRedisClient;

  beforeEach(() => {
    jest.resetModules();
    createClient = jest.fn();
    jest.doMock('redis', () => ({ createClient }));
    ({ connectRedisClient } = require('../../../bootstrap/redisCompat'));
  });

  test('normalizes host/port, attaches the error handler, and connects', async () => {
    const client = mockClient();
    createClient.mockReturnValue(client);
    const onError = jest.fn();

    const result = await connectRedisClient({ host: 'localhost', port: '6379' }, onError);

    expect(createClient).toHaveBeenCalledWith({ socket: { host: 'localhost', port: 6379 } });
    expect(client.on).toHaveBeenCalledWith('error', onError);
    expect(client.connect).toHaveBeenCalledTimes(1);
    expect(result).toBe(client);
  });

  test('a plain connection failure is not swallowed — no retry, error propagates', async () => {
    const client = mockClient({ connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) });
    createClient.mockReturnValue(client);

    await expect(connectRedisClient({ host: 'localhost', port: '6379' })).rejects.toThrow(
      'ECONNREFUSED'
    );
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  test('retries once with RESP: 2 when the server rejects HELLO (Redis <6.0)', async () => {
    const failingClient = mockClient({
      connect: jest.fn().mockRejectedValue(new Error("ERR unknown command 'HELLO'"))
    });
    const workingClient = mockClient();

    createClient.mockReturnValueOnce(failingClient).mockReturnValueOnce(workingClient);

    const result = await connectRedisClient({ host: 'localhost', port: '6379' });

    expect(createClient).toHaveBeenNthCalledWith(1, { socket: { host: 'localhost', port: 6379 } });
    expect(createClient).toHaveBeenNthCalledWith(2, {
      socket: { host: 'localhost', port: 6379 },
      RESP: 2
    });
    expect(result).toBe(workingClient);
  });

  test('does not retry a second time if RESP: 2 was already the configured value', async () => {
    const client = mockClient({
      connect: jest.fn().mockRejectedValue(new Error("ERR unknown command 'HELLO'"))
    });
    createClient.mockReturnValue(client);

    await expect(
      connectRedisClient({ host: 'localhost', port: '6379', RESP: 2 })
    ).rejects.toThrow("ERR unknown command 'HELLO'");
    expect(createClient).toHaveBeenCalledTimes(1);
  });

});
