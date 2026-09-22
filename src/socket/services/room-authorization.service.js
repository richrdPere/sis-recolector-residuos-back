const { Op } = require('sequelize');
const db = require('../../database/models');

const { fail, id } = require('../utils/errors');

const INTERNAL = ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'OPERADOR'];

const canMonitor = (user) => user.roles.some((role) => INTERNAL.includes(role));


function assertMonitor(user) {
  if (!canMonitor(user))
    throw fail('No tiene permiso de monitoreo.', 'MONITOR_FORBIDDEN');
}

async function assertRoute(
  user,
  value,
  { transmit = false } = {}) {

  const recorrido = await db.Recorrido.findByPk(id(value));

  if (!recorrido?.estado)
    throw fail(
      'Recorrido no disponible.',
      'ROUTE_UNAVAILABLE',
      404
    );

  if (!transmit && canMonitor(user))
    return recorrido;

  if (!user.roles.some((r) => (transmit ? ['CONDUCTOR'] : ['CONDUCTOR', 'RECOLECTOR']).includes(r))) {
    throw fail('No tiene acceso al recorrido.', 'ROUTE_FORBIDDEN');
  }

  const personal = await db.PersonalOperativo.findOne({
    where: {
      id_usuario: user.id_usuario,
      estado: true,
      estado_laboral: 'ACTIVO',
    }
  });

  if (!personal)
    throw fail('Personal operativo no disponible.', 'PERSONNEL_INACTIVE');

  const where = {
    id_programacion: recorrido.id_programacion,
    id_personal: personal.id_personal,
    funcion:
    {
      [Op.in]: transmit ? ['CONDUCTOR'] : user.roles.filter((r) => ['CONDUCTOR', 'RECOLECTOR'].includes(r))
    },
    estado_asignacion: { [Op.in]: ['ACEPTADO', 'EN_SERVICIO'] },
  };

  if (transmit)
    where.es_principal = true;

  if (!await db.ProgramacionPersonal.findOne({ where }))
    throw fail('Asignación no autorizada.', 'ASSIGNMENT_FORBIDDEN');

  if (transmit && recorrido.estado_recorrido !== 'EN_CURSO')
    throw fail('El recorrido no está en curso.', 'ROUTE_NOT_IN_PROGRESS', 409);

  return recorrido;
}
module.exports = { assertRoute, assertMonitor, canMonitor };
