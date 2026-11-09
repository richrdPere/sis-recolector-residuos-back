'use strict';

// Database
const { Op } = require('sequelize');
const db = require('../../../database/models');

// Service
// const registerDeliveryResultService = require('../services/motor/register-delivery-result.service');

// Utils
const AppError = require('../../../utils/app-error');

const { revisarRecordatorio } = require('../services/ciudadanos/recordatorio-programacion.utils');

// Firebase
const { getFirebaseMessaging } = require('../../../config/firebase-admin');

// Modelos
const {
  sequelize,
  Notificacion,
  UsuarioDispositivo,
  NotificacionEnvio,
} = db;

// ==========================================================
// ERRORES FCM
// ==========================================================
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const TRANSIENT_CODES = new Set([
  'messaging/internal-error',
  'messaging/server-unavailable',
  'messaging/unknown-error',
  'messaging/quota-exceeded',
  'messaging/message-rate-exceeded',
  'messaging/device-message-rate-exceeded',
  'app/network-error',
  'app/network-timeout',
]);

// ==========================================================
// UTILIDADES
// ==========================================================

const retryDelay = (attempt) =>
  Math.min(
    3600000,
    60000 * (2 ** (attempt - 1)),
  );

const cut = (value, length) =>
  String(value || '').slice(0, length);

const idString = (value) =>
  String(value);

const isExpired = (notification) =>
  notification.fecha_expiracion &&
  new Date(
    notification.fecha_expiracion,
  ).getTime() <= Date.now();

const isFuture = (notification) =>
  notification.fecha_programada &&
  new Date(
    notification.fecha_programada,
  ).getTime() > Date.now();

function validateId(value) {
  const text = String(value ?? '');

  if (
    !/^[1-9]\d*$/.test(text) ||
    BigInt(text) > 9223372036854775807n
  ) {
    throw new AppError(
      'El identificador de la notificación no es válido.',
      400,
      'INVALID_NOTIFICATION_ID',
    );
  }

  // Conserva BIGINT sin pérdida de precisión.
  return text;
}

// ==========================================================
// RECLAMAR NOTIFICACIÓN
// ==========================================================
//
// La transacción solo protege la reclamación.
// No mantiene el bloqueo de fila durante el envío a Firebase.
//

async function claimNotification(id, reintentar) {
  return sequelize.transaction(
    async (transaction) => {
      const notification =
        await Notificacion.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

      if (!notification) {
        throw new AppError(
          'La notificación no existe.',
          404,
          'NOTIFICATION_NOT_FOUND',
        );
      }

      if (
        [
          'BORRADOR',
          'CANCELADA',
          'ENVIADA',
          'PROCESANDO',
        ].includes(
          notification.estado_notificacion,
        )
      ) {
        return {
          omitida: true,
          motivo:
            notification.estado_notificacion,
        };
      }

      if (isExpired(notification)) {
        await notification.update(
          {
            estado_notificacion: 'CANCELADA',
            fecha_procesamiento: new Date(),
          },
          {
            transaction,
            hooks: false,
          },
        );

        return {
          omitida: true,
          motivo: 'EXPIRADA',
        };
      }

      if (isFuture(notification)) {
        return {
          omitida: true,
          motivo: 'PROGRAMADA',
        };
      }

      // ------------------------------------------------------
      // Comprobar recordatorios automáticos antes de enviarlos
      // ------------------------------------------------------

      const revision = await revisarRecordatorio(
        notification,
        transaction,
      );

      if (revision.accion === 'CANCELAR') {
        await notification.update(
          {
            estado_notificacion:
              'CANCELADA',

            fecha_procesamiento:
              new Date(),
          },
          {
            transaction,
            hooks: false,
          },
        );

        return {
          omitida: true,
          motivo: revision.motivo,
        };
      }

      // Para recordatorios vigentes, aplicar los canales
      // que el ciudadano tiene habilitados actualmente.
      if (
        revision.enviar_interna !== undefined
      ) {
        await notification.update(
          {
            enviar_interna: revision.enviar_interna,
            enviar_push: revision.enviar_push,
            fecha_programada: revision.fecha_programada,
          },
          {
            transaction,
            hooks: false,
          },
        );
      }

      if (revision.accion === 'DIFERIR') {
        return {
          omitida: true,
          motivo: 'RECORDATORIO_APLAZADO',
        };
      }

      if (notification.estado_notificacion !== 'PENDIENTE' && !reintentar) {
        return {
          omitida: true,
          motivo: 'REINTENTO_NO_SOLICITADO',
        };
      }

      await notification.update(
        {
          estado_notificacion: 'PROCESANDO',
        },
        {
          transaction,
          hooks: false,
        },
      );

      return {
        notification: notification.get({
          plain: true,
        }),
      };
    },
  );
}

// ==========================================================
// VERIFICAR SI PUEDE CONTINUAR
// ==========================================================

async function canContinue(id) {
  const notification =
    await Notificacion.findByPk(id);

  return (
    notification &&
    notification.estado_notificacion ===
    'PROCESANDO' &&
    !isExpired(notification) &&
    !isFuture(notification)
  );
}

// ==========================================================
// CONSTRUIR PAYLOAD FCM
// ==========================================================

function buildPushPayload({
  notification,
  recipient,
  tokens,
  channelId,
  urlWeb,
}) {
  const payload = {
    tokens,

    notification: {
      title: notification.titulo,
      body: notification.mensaje,
    },

    // FCM exige strings dentro de data.
    data: {
      id_notificacion: idString(
        notification.id_notificacion,
      ),

      id_notificacion_usuario: idString(
        recipient.id_notificacion_usuario,
      ),

      tipo_notificacion: String(
        notification.tipo_notificacion,
      ),

      prioridad: String(
        notification.prioridad,
      ),

      tipo_entidad: String(
        notification.tipo_entidad || '',
      ),

      id_entidad:
        notification.id_entidad == null
          ? ''
          : idString(
            notification.id_entidad,
          ),
    },

    android: {
      priority: 'high',

      notification: {
        channelId,
        sound: 'default',

        tag:
          `notificacion:` +
          notification.id_notificacion,
      },
    },

    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },

    webpush: {
      notification: {
        tag:
          `notificacion:` +
          notification.id_notificacion,
      },

      ...(urlWeb
        ? {
          fcmOptions: {
            link: urlWeb,
          },
        }
        : {}),
    },
  };

  /*
   * Los datos adicionales se consultan por REST.
   * No se copia notification.datos completo al push.
   */

  if (notification.fecha_expiracion) {
    const expirationTimestamp = new Date(
      notification.fecha_expiracion,
    ).getTime();

    const seconds = Math.max(
      0,
      Math.floor(
        (expirationTimestamp - Date.now()) /
        1000,
      ),
    );

    const ttlSeconds = Math.min(
      seconds,
      2419200,
    );

    payload.android.ttl =
      ttlSeconds * 1000;

    payload.apns.headers = {
      'apns-expiration': String(
        Math.floor(
          expirationTimestamp / 1000,
        ),
      ),
    };

    payload.webpush.headers = {
      TTL: String(ttlSeconds),
    };
  }

  return payload;
}

// ==========================================================
// PROCESAR PUSH DE UN DESTINATARIO
// ==========================================================

async function sendRecipientPush(
  notification,
  recipient,
  options,
) {

  // Cargar el servicio cuando los módulos ya terminaron de inicializarse.
  const registerDeliveryResultService = require(
    '../services/motor/register-delivery-result.service',
  );

  if (!notification.enviar_push) {
    await recipient.update(
      {
        estado_push: 'NO_REQUERIDO',
        ultimo_error: null,
      },
      {
        hooks: false,
      },
    );

    return {
      enviados: 0,
      fallidos: 0,
      pendientes: 0,
    };
  }

  // --------------------------------------------------------
  // 1. Consultar dispositivos habilitados
  // --------------------------------------------------------

  const devices = await UsuarioDispositivo.findAll({
    where: {
      id_usuario: recipient.id_usuario,

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

    order: [
      [
        'id_dispositivo',
        'ASC',
      ],
    ],
  });

  const enabledDevices = devices.filter(
    (device) =>
      String(
        device.token_push || '',
      ).trim(),
  );

  if (!enabledDevices.length) {
    await recipient.update(
      {
        estado_push: 'SIN_DISPOSITIVO',

        ultimo_error:
          'No hay dispositivos activos con permiso de notificaciones.',
      },
      {
        hooks: false,
      },
    );

    return {
      enviados: 0,
      fallidos: 0,
      pendientes: 0,
      sin_dispositivo: true,
    };
  }

  // --------------------------------------------------------
  // 2. Consultar historial
  // --------------------------------------------------------

  const history =
    await NotificacionEnvio.findAll({
      where: {
        id_notificacion_usuario:
          recipient.id_notificacion_usuario,
      },

      order: [
        [
          'numero_intento',
          'DESC',
        ],
      ],
    });

  const latestAttempts = new Map();
  const successfulDevices = new Set();

  for (const attempt of history) {
    const deviceKey = idString(
      attempt.id_dispositivo,
    );

    if (
      !latestAttempts.has(deviceKey)
    ) {
      latestAttempts.set(
        deviceKey,
        attempt,
      );
    }

    if (
      attempt.estado_envio ===
      'ENVIADO'
    ) {
      successfulDevices.add(
        deviceKey,
      );
    }
  }

  // --------------------------------------------------------
  // 3. Determinar dispositivos por enviar
  // --------------------------------------------------------

  let enviados = 0;
  let pendientes = 0;
  let lastError = null;

  const queue = [];

  for (const device of enabledDevices) {
    const deviceKey = idString(
      device.id_dispositivo,
    );

    const previous =
      latestAttempts.get(deviceKey);

    if (
      successfulDevices.has(deviceKey)
    ) {
      enviados++;
      continue;
    }

    if (previous) {
      /*
       * Un intento sin resultado definitivo no se
       * reenvía automáticamente.
       */
      if (
        [
          'PENDIENTE',
          'PROCESANDO',
        ].includes(
          previous.estado_envio,
        )
      ) {
        pendientes++;

        lastError =
          'Existe un intento sin resultado definitivo; requiere revisión.';

        continue;
      }

      if (
        Number(
          previous.numero_intento,
        ) >= options.maxIntentos ||
        !TRANSIENT_CODES.has(
          previous.codigo_error,
        )
      ) {
        lastError =
          previous.mensaje_error ||
          'El intento no admite reintento automático.';

        continue;
      }

      const nextAttemptTimestamp =
        new Date(
          previous.fecha_intento,
        ).getTime() +
        retryDelay(
          Number(
            previous.numero_intento,
          ),
        );

      if (
        nextAttemptTimestamp >
        Date.now()
      ) {
        pendientes++;
        continue;
      }
    }

    queue.push({
      device,

      numero: previous
        ? Number(
          previous.numero_intento,
        ) + 1
        : 1,
    });
  }

  // --------------------------------------------------------
  // 4. Enviar lotes
  // --------------------------------------------------------

  let attemptedThisRun = false;

  for (
    let offset = 0;
    offset < queue.length;
    offset += 500
  ) {
    if (
      !await canContinue(
        notification.id_notificacion,
      )
    ) {
      pendientes +=
        queue.length - offset;

      break;
    }

    const batch = queue.slice(
      offset,
      offset + 500,
    );

    /*
     * Se registra el intento antes de contactar a FCM.
     * Si el proceso se interrumpe, queda constancia.
     */
    const attempts = await sequelize.transaction(
      async (transaction) => {
        const result = [];

        for (const item of batch) {
          const attempt =
            await NotificacionEnvio.create(
              {
                id_notificacion_usuario:
                  recipient.id_notificacion_usuario,

                id_dispositivo:
                  item.device.id_dispositivo,

                proveedor: 'FCM',

                numero_intento:
                  item.numero,

                estado_envio:
                  'PROCESANDO',

                fecha_intento:
                  new Date(),
              },
              {
                transaction,
              },
            );

          result.push(attempt);
        }

        return result;
      },
    );

    attemptedThisRun = true;

    const startedAt = Date.now();

    let responses;

    try {
      const payload =
        buildPushPayload({
          notification,
          recipient,

          tokens: batch.map(
            (item) =>
              item.device.token_push,
          ),

          channelId:
            options.channelId,

          urlWeb:
            options.urlWeb,
        });

      const response =
        await getFirebaseMessaging()
          .sendEachForMulticast(
            payload,
          );

      responses =
        response.responses;
    } catch (error) {
      /*
       * Conservar el código original permite
       * determinar si el error admite reintento.
       */
      responses = batch.map(
        () => ({
          success: false,
          error,
        }),
      );
    }

    if (
      !Array.isArray(responses) ||
      responses.length !==
      batch.length
    ) {
      throw new Error(
        'FCM devolvió una respuesta incompleta; revisar intentos PROCESANDO.',
      );
    }

    // ------------------------------------------------------
    // 5. Registrar resultados
    // ------------------------------------------------------
    for (
      let index = 0;
      index < batch.length;
      index++
    ) {
      const delivery = await registerDeliveryResultService({
        id_envio: attempts[index].id_envio,
        resultado: responses[index],
        token_utilizado: batch[index].device.token_push,
        duracion_ms: Date.now() - startedAt,
      });

      if (delivery.exitoso) {
        enviados++;
      } else {
        lastError = delivery.mensaje_error;

        if (
          delivery.reintentable &&
          batch[index].numero <
          options.maxIntentos
        ) {
          pendientes++;
        }
      }
    }
    // for (let index = 0; index < batch.length; index++) {

    //   const result = responses[index];

    //   const errorCode = result.error?.code || 'FCM_UNKNOWN_ERROR';

    //   const errorMessage = cut(
    //     result.error?.message ||
    //     'FCM rechazó el envío.',
    //     1000,
    //   );

    //   const invalidToken =
    //     !result.success &&
    //     INVALID_TOKEN_CODES.has(
    //       errorCode,
    //     );

    //   await sequelize.transaction(
    //     async (transaction) => {
    //       const deliveryState =
    //         result.success
    //           ? 'ENVIADO'
    //           : invalidToken
    //             ? 'TOKEN_INVALIDO'
    //             : 'FALLIDO';

    //       await attempts[index].update(
    //         {
    //           estado_envio:
    //             deliveryState,

    //           id_mensaje_proveedor:
    //             result.messageId ||
    //             null,

    //           codigo_error:
    //             result.success
    //               ? null
    //               : cut(
    //                 errorCode,
    //                 150,
    //               ),

    //           mensaje_error:
    //             result.success
    //               ? null
    //               : errorMessage,

    //           fecha_envio:
    //             result.success
    //               ? new Date()
    //               : null,

    //           duracion_ms:
    //             Date.now() -
    //             startedAt,
    //         },
    //         {
    //           transaction,
    //         },
    //       );

    //       if (invalidToken) {
    //         /*
    //          * Condicionar al token utilizado evita
    //          * revocar uno renovado durante el envío.
    //          */
    //         await UsuarioDispositivo.update(
    //           {
    //             token_push: null,

    //             estado_dispositivo:
    //               'REVOCADO',

    //             fecha_desactivacion:
    //               new Date(),

    //             motivo_desactivacion:
    //               cut(
    //                 errorMessage,
    //                 500,
    //               ),
    //           },
    //           {
    //             where: {
    //               id_dispositivo:
    //                 batch[index]
    //                   .device
    //                   .id_dispositivo,

    //               token_push:
    //                 batch[index]
    //                   .device
    //                   .token_push,
    //             },

    //             transaction,
    //           },
    //         );
    //       }
    //     },
    //   );

    //   if (result.success) {
    //     enviados++;
    //   } else {
    //     lastError =
    //       errorMessage;

    //     if (
    //       TRANSIENT_CODES.has(
    //         errorCode,
    //       ) &&
    //       batch[index].numero <
    //       options.maxIntentos
    //     ) {
    //       pendientes++;
    //     }
    //   }
    // }
  }

  // --------------------------------------------------------
  // 6. Actualizar resumen del destinatario
  // --------------------------------------------------------

  const fallidos =
    enabledDevices.length -
    enviados;

  const pushState =
    fallidos === 0
      ? 'ENVIADO'
      : enviados > 0
        ? 'PARCIAL'
        : pendientes > 0
          ? 'PENDIENTE'
          : 'FALLIDO';

  await recipient.update(
    {
      estado_push:
        pushState,

      /*
       * Cuenta ejecuciones que realizaron al menos
       * un intento. El intento por dispositivo se
       * conserva en NotificacionEnvio.numero_intento.
       */
      cantidad_intentos:
        Number(
          recipient.cantidad_intentos ||
          0,
        ) +
        (
          attemptedThisRun
            ? 1
            : 0
        ),

      fecha_ultimo_envio:
        enviados > 0
          ? new Date()
          : recipient.fecha_ultimo_envio,

      ultimo_error:
        fallidos
          ? lastError ||
          'Hay dispositivos pendientes de envío.'
          : null,
    },
    {
      hooks: false,
    },
  );

  return {
    enviados,
    fallidos,
    pendientes,
  };
}


module.exports = {
  INVALID_TOKEN_CODES,
  TRANSIENT_CODES,
  retryDelay,
  cut,
  idString,
  validateId,
  isFuture,
  isExpired,
  claimNotification,
  canContinue,
  buildPushPayload,
  sendRecipientPush,
};