const recorridoController = require('./recorrido.controller');
const recorridoEventoController = require('./recorrido-evento.controller');

module.exports = {
    ...recorridoController,
    ...recorridoEventoController,
};