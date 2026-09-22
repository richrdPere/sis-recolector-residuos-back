const { refreshIdentity } = require('./identity.service');
const { assertRoute, assertMonitor } = require('./room-authorization.service');
const { responseError } = require('../utils/errors');

const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

async function pruneRooms(socket) {
  const user = await refreshIdentity(socket);
  for (const room of [...socket.rooms]) {
    try {
      if (room === R.monitoreo)
        assertMonitor(user);

      else if (room.startsWith('recorrido:'))
        await assertRoute(user, room.split(':')[1]);
    } catch (error) {
      // Fallo de BD: retirar acceso también (fail closed).
      await socket.leave(room);
      socket.emit(E.ROOM_REVOKED, { room, code: 'ROOM_ACCESS_REVOKED' });
    }
  }
  return user;
}

async function emitAuthorized(io, rooms, event, data) {
  // Unión de salas: cada socket recibe una sola copia.
  const namespace = io.of('/');
  const candidates = [...namespace.sockets.values()].filter(
    (socket) => rooms.some((room) => socket.rooms.has(room)));

  for (const socket of candidates) {
    try {
      await pruneRooms(socket);
      if (socket.connected && socket.data.usuario.exp * 1000 > Date.now() && rooms.some((room) => socket.rooms.has(room)))
        socket.emit(event, data);
    } catch (error) {
      socket.emit(E.AUTH_ERROR, responseError(error));
      socket.disconnect(true);
    }
  }
}

module.exports = { pruneRooms, emitAuthorized };
