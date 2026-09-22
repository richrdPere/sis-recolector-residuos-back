const { fail, responseError } = require('./errors');
const { refreshIdentity } = require('../services/identity.service');
const E = require('../constants/socket-events.constants');
// Cola por conexión, limitada; evita joins/leaves y muestras concurrentes desordenadas.
module.exports = function registerEvent(socket, event, action, { publicAccess = false } = {}) {
  socket.on(event, (payload, acknowledgement) => {
    if (typeof payload === 'function') { acknowledgement = payload; payload = {}; }
    const reply = (result) => {
      if (typeof acknowledgement === 'function') acknowledgement(result);
      else socket.emit(E.ERROR, { ...result, event });
    };
    const now = Date.now();
    const rate = socket.data.eventRate || { start: now, count: 0 };
    if (now - rate.start >= 10000) { rate.start = now; rate.count = 0; }
    socket.data.eventRate = rate;
    if (++rate.count > 30 || (socket.data.pendingEvents || 0) >= 8) {
      return reply(responseError(fail('Demasiados eventos; reintente más tarde.', 'RATE_LIMIT', 429)));
    }
    socket.data.pendingEvents = (socket.data.pendingEvents || 0) + 1;
    const run = async () => {
      try {
        if (!socket.connected) return;
        if (typeof acknowledgement !== 'function') throw fail('Debe enviar callback de confirmación.', 'ACK_REQUIRED', 400);
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Payload inválido.', 'INVALID_PAYLOAD', 400);
        if (!publicAccess) await refreshIdentity(socket);
        const data = await action(payload);
        reply({ success: true, message: 'Operación completada.', data });
      } catch (error) {
        const result = responseError(error);
        if (result.statusCode === 500) console.error('[socket]', event, error.name, error.code || 'INTERNAL');
        reply(result);
        if (result.statusCode === 401) socket.disconnect(true);
      } finally { socket.data.pendingEvents -= 1; }
    };
    socket.data.eventQueue = (socket.data.eventQueue || Promise.resolve()).then(run, run);
  });
};
