const db = require('../../database/models');
const register = require('../utils/register-event');
const { assertRoute } = require('../services/room-authorization.service');
const { fail, id } = require('../utils/errors');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = (_io, socket) => {
  register(socket, E.ROUTE_JOIN, async ({ id_recorrido }) => {

    const recorrido = await assertRoute(socket.data.usuario, id_recorrido);
    const room = R.recorrido(recorrido.id_recorrido);

    if (!socket.rooms.has(room) && [...socket.rooms].filter(
      (r) => r.startsWith('recorrido:')).length >= 20)
      throw fail('Máximo 20 recorridos por conexión.', 'ROOM_LIMIT', 429);

    await socket.join(room);

    const location = await db.RecorridoUltimaUbicacion.findOne({ where: { id_recorrido: recorrido.id_recorrido } });
    return {
      room,
      id_recorrido: recorrido.id_recorrido,
      estado_recorrido: recorrido.estado_recorrido,
      ultima_ubicacion: location
    };
  });

  register(socket, E.ROUTE_LEAVE, async ({ id_recorrido }) => {
    const room = R.recorrido(id(id_recorrido)); 
    await socket.leave(room); return { room };
  });
};
