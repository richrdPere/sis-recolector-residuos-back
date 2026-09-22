const register = require('../utils/register-event');
const { assertRoute } = require('../services/room-authorization.service');
const registerLocation = require('../../modules/tracking/services/register-location.service');
const E = require('../constants/socket-events.constants');

module.exports = (_io, socket) => {

  register(socket, E.TRACKING_SEND, async (payload) => {
    await assertRoute(
      socket.data.usuario,
      payload.id_recorrido,
      { transmit: true }
    );

    const result = await registerLocation(payload, {
      id_usuario: socket.data.usuario.id_usuario,
      origen: 'MOVIL',
    });

    // El service termina después del commit. Los hooks publican por separado.
    return {
      id_recorrido: result.posicion.id_recorrido,
      id_posicion: result.posicion.id_posicion,
      clave_idempotencia: result.posicion.clave_idempotencia,
      duplicada: result.duplicada,
      ultima_ubicacion_actualizada: result.ultima_ubicacion_actualizada
    };
  });
};
