const register = require('../utils/register-event');
const { assertMonitor } = require('../services/room-authorization.service');
const getLocations = require('../../modules/tracking/services/get-active-vehicle-locations.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = (_io, socket) => {
  register(socket, E.MONITOR_JOIN, async () => {
    assertMonitor(socket.data.usuario);
    await socket.join(R.monitoreo);

    return {
      room: R.monitoreo,
      recorridos: await getLocations()
    };
  });
  
  register(socket, E.MONITOR_LEAVE, async () => {
    await socket.leave(R.monitoreo);
    return {
      room: R.monitoreo
    };
  });
};
