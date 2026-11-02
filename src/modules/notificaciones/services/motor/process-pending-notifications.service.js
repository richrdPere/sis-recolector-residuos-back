'use strict';

const { Op } = require('sequelize');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const dispatchNotificationService = require('./dispatch-notification.service');

// Utils
const {
  validateId,
  isExpired,
  retryDelay,
  TRANSIENT_CODES,
} = require('../../utils/motor-notification.utils');

// Modelos
const {
  Notificacion,
  NotificacionUsuario,
  UsuarioDispositivo,
  NotificacionEnvio,
} = db;

// ==========================================================
// COMPROBAR SI EXISTE UN DESTINO REINTENTABLE
// ==========================================================
const hasRetryableDestination = async (
  notificationId,
  maxIntentos,
) => {
  const recipients =
    await NotificacionUsuario.findAll({
      where: {
        id_notificacion: notificationId,
      },
      attributes: [
        'id_notificacion_usuario',
        'id_usuario',
      ],
    });

  if (!recipients.length) return false;

  const devices = await UsuarioDispositivo.findAll({
    where: {
      id_usuario: {
        [Op.in]: recipients.map(
          (recipient) => recipient.id_usuario,
        ),
      },

      estado_dispositivo: 'ACTIVO',

      permiso_notificaciones: {
        [Op.in]: [
          'AUTORIZADO',
          'PROVISIONAL',
        ],
      },

      token_push: {
        [Op.ne]: null,
      },
    },

    attributes: [
      'id_dispositivo',
      'id_usuario',
      'token_push',
    ],
  });

  const attempts = await NotificacionEnvio.findAll({
    where: {
      id_notificacion_usuario: {
        [Op.in]: recipients.map(
          (recipient) =>
            recipient.id_notificacion_usuario,
        ),
      },
    },

    order: [
      ['numero_intento', 'DESC'],
    ],
  });

  const latest = new Map();
  const successful = new Set();

  for (const attempt of attempts) {
    const key =
      `${attempt.id_notificacion_usuario}:` +
      attempt.id_dispositivo;

    if (!latest.has(key)) {
      latest.set(key, attempt);
    }

    if (attempt.estado_envio === 'ENVIADO') {
      successful.add(key);
    }
  }

  const recipientByUser = new Map(
    recipients.map((recipient) => [
      String(recipient.id_usuario),
      recipient,
    ]),
  );

  for (const device of devices) {
    if (!String(device.token_push || '').trim()) {
      continue;
    }

    const recipient = recipientByUser.get(
      String(device.id_usuario),
    );

    const key =
      `${recipient.id_notificacion_usuario}:` +
      device.id_dispositivo;

    if (successful.has(key)) continue;

    const previous = latest.get(key);

    // Dispositivo nuevo: todavía no hubo un intento.
    if (!previous) return true;

    if (
      previous.estado_envio !== 'FALLIDO' ||
      !TRANSIENT_CODES.has(previous.codigo_error) ||
      Number(previous.numero_intento) >= maxIntentos
    ) {
      continue;
    }

    const fechaIntento = new Date(
      previous.fecha_intento,
    ).getTime();

    if (!Number.isFinite(fechaIntento)) {
      continue;
    }

    const nextAttemptAt =
      fechaIntento +
      retryDelay(
        Number(previous.numero_intento),
      );

    if (nextAttemptAt <= Date.now()) {
      return true;
    }
  }

  return false;
};

// ==========================================================
// SERVICE: PROCESAR UN LOTE DE NOTIFICACIONES
// ==========================================================

const processPendingNotificationsService = async ({
  limit = 20,
  despues_de = null,
  incluir_reintentos = true,
  maxIntentos = 3,
} = {}) => {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(maxIntentos) ||
    maxIntentos < 1 ||
    maxIntentos > 10 ||
    typeof incluir_reintentos !== 'boolean'
  ) {
    throw new AppError(
      'Las opciones de procesamiento no son válidas.',
      400,
      'INVALID_PROCESSING_OPTIONS',
    );
  }

  const cursor = despues_de == null
    ? null
    : validateId(despues_de);

  const now = new Date();

  const where = {
    estado_notificacion: {
      [Op.in]: incluir_reintentos
        ? ['PENDIENTE', 'PARCIAL', 'FALLIDA']
        : ['PENDIENTE'],
    },

    [Op.and]: [
      {
        [Op.or]: [
          { fecha_programada: null },
          {
            fecha_programada: {
              [Op.lte]: now,
            },
          },
          // Permite cancelar una pendiente ya expirada.
          {
            fecha_expiracion: {
              [Op.lte]: now,
            },
          },
        ],
      },
    ],
  };

  if (cursor) {
    where.id_notificacion = {
      [Op.gt]: cursor,
    };
  }

  const notifications =
    await Notificacion.findAll({
      where,
      order: [
        ['id_notificacion', 'ASC'],
      ],
      limit,
    });

  const summary = {
    revisadas: notifications.length,
    procesadas: 0,
    omitidas: 0,
    errores: 0,
    resultados: [],
    proximo_cursor:
      notifications.length === limit
        ? String(
          notifications[
            notifications.length - 1
          ].id_notificacion,
        )
        : null,
  };

  for (const notification of notifications) {
    const notificationId =
      String(notification.id_notificacion);

    try {
      const isRetry =
        notification.estado_notificacion !==
        'PENDIENTE';

      /*
       * No ejecutar otra vez el dispatcher por errores
       * permanentes, intentos inciertos o espera pendiente.
       */
      if (
        isRetry &&
        !isExpired(notification) &&
        (
          !notification.enviar_push ||
          !await hasRetryableDestination(
            notificationId,
            maxIntentos,
          )
        )
      ) {
        summary.omitidas++;

        summary.resultados.push({
          id_notificacion: notificationId,
          omitida: true,
          motivo: 'SIN_DESTINOS_REINTENTABLES',
        });

        continue;
      }

      /*
       * El dispatcher reclama la fila de forma atómica.
       * La consulta anterior no sustituye ese bloqueo.
       */
      const result =
        await dispatchNotificationService({
          id_notificacion: notificationId,
          reintentar: isRetry,
          maxIntentos,
        });

      if (result.omitida) {
        summary.omitidas++;
      } else {
        summary.procesadas++;
      }

      summary.resultados.push(result);
    } catch (error) {
      summary.errores++;

      summary.resultados.push({
        id_notificacion: notificationId,
        error: true,
        codigo:
          error.code ||
          'NOTIFICATION_DISPATCH_ERROR',
      });

      console.error(
        '[notificaciones:pendientes]',
        notificationId,
        error.name,
      );
    }
  }

  return summary;
};

module.exports = processPendingNotificationsService;