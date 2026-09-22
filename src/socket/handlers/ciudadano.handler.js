const register = require('../utils/register-event');
const { snapshot } = require('../services/public.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = (_io, socket) => {

  register(socket, E.PUBLIC_JOIN, async ({ token_publico }) => {
    const { qr, data } = await snapshot(token_publico);

    for (const room of [...socket.rooms])
      if (room.startsWith('publico:qr:'))
        await socket.leave(room);

    const room = R.publicoQr(qr.id_codigo_qr);

    await socket.join(room);

    socket.data.publicToken = token_publico;

    return { room, ...data };
  },
    {
      publicAccess: true
    }
  );

  register(socket, E.PUBLIC_LEAVE, async () => {
    delete socket.data.publicToken;

    for (const room of [...socket.rooms])
      if (room.startsWith('publico:qr:'))
        await socket.leave(room);

    return { desuscrito: true };
  },
    {
      publicAccess: true
    }
  );
};
