/**
 * Sockets (Socket.IO) integration tests
 * Verifies handshake auth (config/sockets/middlewares/auth.js) and
 * event routing (config/sockets/events.js -> sockets/EchoController.js)
 */

const path = require('node:path');
const { io } = require('socket.io-client');

require('dotenv').config({ path: path.join(__dirname, '../../.env.test'), quiet: !process.env.DOTENV_VERBOSE });

const SERVER_URL = process.env.TEST_SERVER_URL;

async function getToken() {
  const res = await fetch(`${SERVER_URL}/test/sockettoken`);
  const { data } = await res.json();
  return data.token;
}

function connect(auth) {
  return io(SERVER_URL, {
    auth,
    transports: ['websocket'],
    reconnection: false,
    forceNew: true
  });
}

describe('Sockets', () => {

  let openSockets = [];

  afterEach(() => {
    openSockets.forEach((socket) => socket.disconnect());
    openSockets = [];
  });

  it('rejects the handshake when no auth token is provided', async () => {
    const socket = connect({});
    openSockets.push(socket);

    const error = await new Promise((resolve) => {
      socket.on('connect_error', resolve);
      socket.on('connect', () => resolve(null));
    });

    expect(error).not.toBeNull();
    expect(socket.connected).toBe(false);
  });

  it('accepts the handshake with a valid JWT and connects', async () => {
    const token = await getToken();
    const socket = connect({ token });
    openSockets.push(socket);

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    expect(socket.connected).toBe(true);
  });

  it('routes the "echo" event to EchoController and gets the authenticated user back', async () => {
    const token = await getToken();
    const socket = connect({ token });
    openSockets.push(socket);

    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
    });

    const response = await new Promise((resolve) => {
      socket.emit('echo', { message: 'hello sockets' }, resolve);
    });

    expect(response.echo).toEqual({ message: 'hello sockets' });
    expect(response.userId).toBe('socket-test-user');
  });

});
