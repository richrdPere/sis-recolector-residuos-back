const { snapshot } = require('../services/public.service');
const E = require('../constants/socket-events.constants');

module.exports = async (io) => {
  const cache = new Map();

  for (const socket of io.of('/publico').sockets.values()) {

    const token = socket.data.publicToken;
    if (!token) continue;
    try {
      if (!cache.has(token))
        cache.set(token, snapshot(token));

      const { data } = await cache.get(token);

      if (socket.connected && socket.data.publicToken === token)
        socket.emit(E.PUBLIC_SNAPSHOT, data);
    } catch (_) {
      if (socket.data.publicToken !== token)
        continue;

      delete socket.data.publicToken;
      for (const room of [...socket.rooms])
        if (room.startsWith('publico:qr:'))
          await socket.leave(room);

      socket.emit(
        E.PUBLIC_SNAPSHOT, {
        disponible: false,
        code: 'QR_UNAVAILABLE',
        rutas: []
      }
      );
    }
  }
};
