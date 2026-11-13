const recorridoController = require('./recorrido.controller');
const recorridoEventoController = require('./recorrido-evento.controller');
const recorridoHistorialController = require('./recorrido-historial.controller');

module.exports = {
  ...recorridoController,
  ...recorridoEventoController,
  ...recorridoHistorialController,
};