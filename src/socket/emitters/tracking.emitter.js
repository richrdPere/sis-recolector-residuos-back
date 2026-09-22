const db = require('../../database/models');
const { emitAuthorized } = require('../services/delivery.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = async (io, id_recorrido) => {
  const recorrido = await db.Recorrido.findByPk(id_recorrido);
  if (!recorrido?.estado || recorrido.estado_recorrido !== 'EN_CURSO') return;
  const location = await db.RecorridoUltimaUbicacion.findOne({ where: { id_recorrido } });
  if (!location) return;
  await emitAuthorized(io, [R.monitoreo, R.recorrido(id_recorrido)], E.TRACKING_UPDATED,
    { id_recorrido, id_posicion: location.id_posicion, fecha_dispositivo: location.fecha_dispositivo,
      ubicacion: location.toJSON() });
};
