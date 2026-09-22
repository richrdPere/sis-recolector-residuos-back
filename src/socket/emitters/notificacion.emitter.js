const db = require('../../database/models');
const { emitAuthorized } = require('../services/delivery.service');
const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

module.exports = async (io, id_notificacion, read = false) => {
  const note = await db.Notificacion.findByPk(id_notificacion);
  const now = Date.now();

  if (!note?.enviar_interna || ['BORRADOR', 'CANCELADA'].includes(note.estado_notificacion) ||
    (note.fecha_programada && new Date(note.fecha_programada).getTime() > now) ||
    (note.fecha_expiracion && new Date(note.fecha_expiracion).getTime() <= now)) return;

  const recipients = await db.NotificacionUsuario.findAll({ where: { id_notificacion } });

  for (const row of recipients) {
    await emitAuthorized(io, [R.usuario(row.id_usuario)], read ? E.NOTIFICATION_READ : E.NOTIFICATION_NEW,
      { id_notificacion, id_notificacion_usuario: row.id_notificacion_usuario, refrescar: true });
  }
};
