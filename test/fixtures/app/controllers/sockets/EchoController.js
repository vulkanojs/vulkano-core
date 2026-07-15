module.exports = {

  // Echoes the received body back to the caller and exposes the
  // authenticated user set by the socket auth middleware.
  echo({ socket, body }, callback) {
    callback({
      echo: body,
      userId: (socket.request.user || {})._id || null
    });
  }

};
