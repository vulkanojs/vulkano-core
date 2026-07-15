/**
 *
 * Sockets Config
 *
 */

module.exports = {

  // Enable sockets
  enabled: true,

  // Socket IO Adapter (redis|mongodb|memory)
  adapter: 'memory',

  // Socket configuration
  config: {

    // Transports
    transports: ['websocket', 'polling'],

    // Socket timeout
    timeout: 4000,

    // Interval
    interval: 2000,

  },

  // Connections
  connections: {

    users: 0,

    // Clients connected
    clients: {}

  },

  // Event handlers
  // onConnect: (io, socket, clients, counter) => {
  //   counter.users++;
  //   clients[socket.request.user._id] = socket.id;
  //   io.emit('users:counter', counter.users);
  // },
  // onDisconnect: (io, socket, clients, counter) => {
  //   counter.users--;
  //   delete clients[socket.request.user._id];
  //   io.emit('users:counter', counter.users);
  // }
};
