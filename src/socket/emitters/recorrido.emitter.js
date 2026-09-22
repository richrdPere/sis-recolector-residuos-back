const db = require('../../database/models');
const { emitAuthorized } = require('../services/delivery.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = async (io, id_recorrido) => {
  const row = await db.Recorrido.findByPk(id_recorrido);
  if (!row) return;
  await emitAuthorized(io, [R.monitoreo, R.recorrido(id_recorrido)], E.ROUTE_UPDATED,
    { id_recorrido, id_programacion: row.id_programacion, estado_recorrido: row.estado_recorrido, updated_at: row.updated_at });
};
