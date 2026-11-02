module.exports = {

  host: process.env.REDIS_HOST || 'localhost',

  port: process.env.REDIS_PORT || '6379',

  password: process.env.REDIS_PASSWORD || '',

  // Channel prefix — only applied when set (adapter default: 'socket.io')
  key: process.env.SOCKETS_REDIS_KEY || 'socket.io',

  // ms to wait for other nodes on inter-server requests (fetchSockets, serverSideEmit…) — only applied when set (adapter default: 5000)
  requestsTimeout: process.env.SOCKETS_REDIS_TIMEOUT || ''

};
