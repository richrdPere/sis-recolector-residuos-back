const db = require('../../database/models');
const { emitAuthorized } = require('../services/delivery.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');
module.exports = async (io, id_programacion) => {
  const assignments = await db.ProgramacionPersonal.findAll({ where: { id_programacion } });
  const rooms = [R.monitoreo];
  for (const assignment of assignments) {
    const person = await db.PersonalOperativo.findByPk(assignment.id_personal);
    if (person) rooms.push(R.usuario(person.id_usuario));
  }
  // Solo invalidación: cada usuario recupera el detalle mediante su API autorizada.
  await emitAuthorized(io, rooms, E.PROGRAM_UPDATED, { id_programacion, refrescar: true });
};
