const tracking = require('./handlers/tracking.handler');
const recorrido = require('./handlers/recorrido.handler');
const monitoreo = require('./handlers/monitoreo.handler');

module.exports = (io, socket) => {
    tracking(io, socket);
    recorrido(io, socket);
    monitoreo(io, socket);
};
