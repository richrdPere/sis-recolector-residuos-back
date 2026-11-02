'use strict';

const db = require('../../database/models');

const { emitAuthorized } = require('../services/delivery.service');

const R = require('../constants/socket-rooms.constants');
const E = require('../constants/socket-events.constants');

// ==========================================================
// VALIDAR IDENTIFICADOR SIN PERDER PRECISIÓN BIGINT
// ==========================================================

function normalizeId(value, field) {
  const text = String(value ?? '');

  if (
    !/^[1-9]\d*$/.test(text) ||
    BigInt(text) > 9223372036854775807n
  ) {
    throw new TypeError(
      `${field} no es válido.`,
    );
  }

  return text;
}

// ==========================================================
// EMITIR A UN DESTINATARIO ESPECÍFICO
// ==========================================================
//
// Uso:
// emitter(io, idNotificacion, {
//   id_usuario,
//   id_notificacion_usuario,
//   read: false,
// });
//
// No consulta ni recorre todos los destinatarios.
//

const notificationEmitter = async (
  io,
  id_notificacion,
  options = {},
) => {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options)
  ) {
    throw new TypeError(
      'Debe proporcionar las opciones del destinatario.',
    );
  }

  const {
    id_usuario,
    id_notificacion_usuario,
    read = false,
  } = options;

  if (typeof read !== 'boolean') {
    throw new TypeError(
      'read debe ser boolean.',
    );
  }

  const notificationId = normalizeId(
    id_notificacion,
    'id_notificacion',
  );

  const userId = normalizeId(
    id_usuario,
    'id_usuario',
  );

  const recipientId = normalizeId(
    id_notificacion_usuario,
    'id_notificacion_usuario',
  );

  if (!io) {
    return {
      publicada: false,
      motivo: 'SOCKET_NO_DISPONIBLE',
    };
  }

  /*
   * Verificar conjuntamente los tres identificadores.
   * No permite emitir la notificación de otro destinatario.
   */
  const recipient =
    await db.NotificacionUsuario.findOne({
      where: {
        id_notificacion_usuario:
          recipientId,

        id_notificacion:
          notificationId,

        id_usuario:
          userId,
      },

      include: [
        {
          association: 'notificacion',
          required: true,
        },
      ],
    });

  if (!recipient) {
    return {
      publicada: false,
      motivo: 'DESTINATARIO_NO_ENCONTRADO',
    };
  }

  const notification =
    recipient.notificacion;

  let event;
  let payload;

  // ========================================================
  // LECTURA: SOLO EL USUARIO QUE LEYÓ
  // ========================================================

  if (read) {
    if (!recipient.leida) {
      return {
        publicada: false,
        motivo: 'NOTIFICACION_NO_LEIDA',
      };
    }

    event = E.NOTIFICATION_READ;

    payload = {
      id_notificacion:
        notificationId,

      id_notificacion_usuario:
        recipientId,

      leida: true,

      fecha_leida:
        recipient.fecha_leida,

      refrescar: true,
    };
  } else {
    // ======================================================
    // NUEVA NOTIFICACIÓN
    // ======================================================

    const now = Date.now();

    if (
      !notification.enviar_interna ||
      [
        'BORRADOR',
        'CANCELADA',
      ].includes(
        notification.estado_notificacion,
      )
    ) {
      return {
        publicada: false,
        motivo: 'NOTIFICACION_NO_PUBLICABLE',
      };
    }

    if (
      notification.fecha_programada &&
      new Date(
        notification.fecha_programada,
      ).getTime() > now
    ) {
      return {
        publicada: false,
        motivo: 'PROGRAMADA',
      };
    }

    if (
      notification.fecha_expiracion &&
      new Date(
        notification.fecha_expiracion,
      ).getTime() <= now
    ) {
      return {
        publicada: false,
        motivo: 'EXPIRADA',
      };
    }

    if (
      recipient.archivada ||
      recipient.leida
    ) {
      return {
        publicada: false,
        motivo: 'YA_LEIDA_O_ARCHIVADA',
      };
    }

    event = E.NOTIFICATION_NEW;

    payload = {
      id_notificacion:
        notificationId,

      id_notificacion_usuario:
        recipientId,

      tipo_notificacion:
        notification.tipo_notificacion,

      prioridad:
        notification.prioridad,

      titulo:
        notification.titulo,

      mensaje:
        notification.mensaje,

      tipo_entidad:
        notification.tipo_entidad,

      id_entidad:
        notification.id_entidad,

      datos:
        notification.datos,

      created_at:
        notification.created_at,

      refrescar: true,
    };
  }

  await emitAuthorized(
    io,
    [R.usuario(userId)],
    event,
    payload,
  );

  /*
   * Publicación intentada.
   * No representa un acuse de recepción del cliente.
   */
  return {
    publicada: true,
    evento: event,
    id_notificacion: notificationId,
    id_notificacion_usuario: recipientId,
  };
};

module.exports = notificationEmitter;

// const db = require('../../database/models');
// const { emitAuthorized } = require('../services/delivery.service');
// const R = require('../constants/socket-rooms.constants');
// const E = require('../constants/socket-events.constants');

// module.exports = async (io, id_notificacion, read = false) => {
//   const note = await db.Notificacion.findByPk(id_notificacion);
//   const now = Date.now();

//   if (!note?.enviar_interna || ['BORRADOR', 'CANCELADA'].includes(note.estado_notificacion) ||
//     (note.fecha_programada && new Date(note.fecha_programada).getTime() > now) ||
//     (note.fecha_expiracion && new Date(note.fecha_expiracion).getTime() <= now)) return;

//   const recipients = await db.NotificacionUsuario.findAll({ where: { id_notificacion } });

//   for (const row of recipients) {
//     await emitAuthorized(
//       io,
//       [R.usuario(row.id_usuario)],
//       read ? E.NOTIFICATION_READ : E.NOTIFICATION_NEW,

//       {
//         id_notificacion,
//         id_notificacion_usuario: row.id_notificacion_usuario,
//         refrescar: true
//       }
//     );
//   }
// };
