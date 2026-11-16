'use strict';

const db = require('../../../../database/models');

const AppError = require(
  '../../../../utils/app-error'
);

const {
  validateId,
  claimNotification,
  canContinue,
  ownsLease,
  sendRecipientPush,
  isFuture,
  isExpired,
} = require(
  '../../utils/motor-notification.utils'
);

const {
  getIO,
} = require('../../../../socket');

const notificationEmitter = require(
  '../../../../socket/emitters/notificacion.emitter'
);

const {
  sequelize,
  Notificacion,
  NotificacionUsuario,
} = db;

// ==========================================================
// RESERVAR PUBLICACIÓN INTERNA
// ==========================================================

async function reserveInternalPublication(
  notification,
  recipient,
) {
  return sequelize.transaction(
    async transaction => {
      const current =
        await Notificacion.findByPk(
          notification.id_notificacion,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      if (
        !ownsLease(
          current,
          notification.token_procesamiento,
        ) ||
        isExpired(current) ||
        isFuture(current)
      ) {
        return false;
      }

      const target =
        await NotificacionUsuario.findByPk(
          recipient.id_notificacion_usuario,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      if (
        !target ||
        target.leida ||
        target.archivada ||
        target.fecha_publicacion_interna
      ) {
        return false;
      }

      await target.update(
        {
          fecha_publicacion_interna: new Date(),
        },
        {
          transaction,
          hooks: false,
        },
      );

      return true;
    },
  );
}

// ==========================================================
// DESPACHAR NOTIFICACIÓN
// ==========================================================

const dispatchNotificationService = async ({
  id_notificacion,

  io = getIO(),

  reintentar = false,
  maxIntentos = 3,

  channelId =
  process.env.FCM_ANDROID_CHANNEL_ID ||
  'recoleccion_alertas',

  urlWeb = null,
} = {}) => {
  const notificationId =
    validateId(id_notificacion);

  if (
    typeof reintentar !== 'boolean' ||
    !Number.isInteger(maxIntentos) ||
    maxIntentos < 1 ||
    maxIntentos > 10 ||
    typeof channelId !== 'string' ||
    !channelId.trim()
  ) {
    throw new AppError(
      'Opciones de despacho no válidas.',
      400,
      'INVALID_DISPATCH_OPTIONS',
    );
  }

  if (urlWeb !== null) {
    try {
      const url = new URL(urlWeb);

      if (url.protocol !== 'https:') {
        throw new Error();
      }
    } catch (_) {
      throw new AppError(
        'urlWeb debe ser una URL HTTPS absoluta.',
        400,
        'INVALID_PUSH_URL',
      );
    }
  }

  // --------------------------------------------------------
  // RECLAMAR TRABAJO
  // --------------------------------------------------------

  const claimed = await claimNotification(
    notificationId,
    reintentar,
  );

  if (claimed.omitida) {
    return {
      id_notificacion: notificationId,
      ...claimed,
    };
  }

  const notification = claimed.notification;

  // --------------------------------------------------------
  // RENOVAR RESERVA CADA MINUTO
  // --------------------------------------------------------

  let renewing = false;

  const heartbeat = setInterval(
    async () => {
      if (renewing) return;

      renewing = true;

      try {
        const vigente = await canContinue(
          notificationId,
          notification.token_procesamiento,
        );

        if (!vigente) {
          clearInterval(heartbeat);
        }
      } catch (error) {
        // Si MySQL impide renovar, la reserva vencerá.
        // Las comprobaciones de propiedad bloquean
        // a una ejecución que haya perdido el trabajo.
        console.error(
          '[notificaciones:reserva]',
          notificationId,
          error.name,
        );
      } finally {
        renewing = false;
      }
    },
    60000,
  );

  heartbeat.unref?.();

  try {
    const recipients =
      await NotificacionUsuario.findAll({
        where: {
          id_notificacion: notificationId,
        },

        order: [
          ['id_notificacion_usuario', 'ASC'],
        ],
      });

    if (!recipients.length) {
      throw new Error(
        'La notificación no tiene destinatarios.',
      );
    }

    const summary = {
      enviados: 0,
      fallidos: 0,
      pendientes: 0,
      sin_dispositivo: 0,
      socket_publicaciones: 0,
      socket_errores: 0,
    };

    // ------------------------------------------------------
    // PROCESAR DESTINATARIOS
    // ------------------------------------------------------

    for (const recipient of recipients) {
      const vigente = await canContinue(
        notificationId,
        notification.token_procesamiento,
      );

      if (!vigente) break;

      // Canal interno.
      if (
        notification.enviar_interna &&
        io &&
        !recipient.archivada &&
        !recipient.leida &&
        await reserveInternalPublication(
          notification,
          recipient,
        )
      ) {
        try {
          const publication =
            await notificationEmitter(
              io,
              notificationId,
              {
                id_usuario:
                  recipient.id_usuario,

                id_notificacion_usuario:
                  recipient.id_notificacion_usuario,
              },
            );

          if (publication.publicada) {
            summary.socket_publicaciones++;
          }
        } catch (error) {
          summary.socket_errores++;

          console.error(
            '[notificacion:socket]',
            notificationId,
            error.name,
          );
        }
      }

      // Canal push.
      // sendRecipientPush conserva los éxitos previos
      // y no reenvía intentos inciertos.
      const push = await sendRecipientPush(
        notification,
        recipient,
        {
          maxIntentos,
          channelId,
          urlWeb,
        },
      );

      summary.enviados += push.enviados;
      summary.fallidos += push.fallidos;
      summary.pendientes += push.pendientes;

      if (push.sin_dispositivo) {
        summary.sin_dispositivo++;
      }
    }

    // ------------------------------------------------------
    // FINALIZAR SOLO SI CONSERVA LA PROPIEDAD
    // ------------------------------------------------------

    const finalState =
      await sequelize.transaction(
        async transaction => {
          const current =
            await Notificacion.findByPk(
              notificationId,
              {
                transaction,
                lock: transaction.LOCK.UPDATE,
              },
            );

          if (
            !ownsLease(
              current,
              notification.token_procesamiento,
            )
          ) {
            return current?.estado_notificacion ??
              'NO_DISPONIBLE';
          }

          if (isFuture(current)) {
            await current.update(
              {
                estado_notificacion: 'PENDIENTE',
                token_procesamiento: null,
                procesamiento_hasta: null,
              },
              {
                transaction,
                hooks: false,
              },
            );

            return 'PENDIENTE';
          }

          const pushComplete =
            !notification.enviar_push ||
            (
              summary.fallidos === 0 &&
              summary.pendientes === 0 &&
              summary.sin_dispositivo === 0
            );

          const state = isExpired(current)
            ? 'CANCELADA'
            : pushComplete
              ? 'ENVIADA'
              : (
                notification.enviar_interna ||
                summary.enviados > 0
              )
                ? 'PARCIAL'
                : 'FALLIDA';

          await current.update(
            {
              estado_notificacion: state,

              token_procesamiento: null,
              procesamiento_hasta: null,

              fecha_procesamiento: new Date(),
            },
            {
              transaction,
              hooks: false,
            },
          );

          return state;
        },
      );

    return {
      id_notificacion: notificationId,

      estado_notificacion: finalState,

      reintento_pendiente:
        summary.pendientes > 0,

      ...summary,
    };
  } catch (error) {
    // Conservar la reserva y PROCESANDO.
    // El recuperador actuará cuando venza la reserva,
    // sin repetir los intentos sin resultado confirmado.
    console.error(
      '[notificacion:dispatch]',
      notificationId,
      error.code || error.name,
    );

    throw error;
  } finally {
    clearInterval(heartbeat);
  }
};

module.exports = dispatchNotificationService;

// // Database
// const db = require('../../../../database/models');

// // Utils
// const AppError = require('../../../../utils/app-error');
// const {
//   validateId,
//   claimNotification,
//   canContinue,
//   sendRecipientPush,
//   isFuture,
//   isExpired,
// } = require('../../utils/motor-notification.utils');

// // Socket.IO
// const { getIO } = require('../../../../socket');
// const notificationEmitter = require('../../../../socket/emitters/notificacion.emitter');

// // Modelos
// const {
//   sequelize,
//   Notificacion,
//   NotificacionUsuario,
// } = db;


// // ==========================================================
// // SERVICE: DESPACHAR NOTIFICACIÓN
// // ==========================================================
// //
// // Debe ejecutarse después del commit de la creación.
// //
// // reintentar:
// //   Permite procesar PARCIAL y FALLIDA.
// //   No fuerza reenvíos exitosos ni elimina la espera.
// //
// // maxIntentos:
// //   Máximo por dispositivo.
// //
// // Importante:
// //   PROCESANDO no se recupera automáticamente.
// //   Requiere revisión cuando el proceso se interrumpe.
// //

// const dispatchNotificationService = async ({
//   id_notificacion,

//   io = getIO(),

//   reintentar = false,

//   maxIntentos = 3,

//   channelId = process.env.FCM_ANDROID_CHANNEL_ID || 'recoleccion_alertas',

//   urlWeb = null,
// } = {}) => {
//   const notificationId = validateId(id_notificacion);

//   // ------------------------------------------------------
//   // 1. Validar opciones
//   // ------------------------------------------------------

//   if (
//     typeof reintentar !==
//     'boolean' ||
//     !Number.isInteger(
//       maxIntentos,
//     ) ||
//     maxIntentos < 1 ||
//     maxIntentos > 10 ||
//     typeof channelId !==
//     'string' ||
//     !channelId.trim()
//   ) {
//     throw new AppError(
//       'Opciones de despacho no válidas.',
//       400,
//       'INVALID_DISPATCH_OPTIONS',
//     );
//   }

//   if (urlWeb !== null) {
//     try {
//       const url =
//         new URL(urlWeb);

//       if (
//         url.protocol !==
//         'https:'
//       ) {
//         throw new Error();
//       }
//     } catch (_) {
//       throw new AppError(
//         'urlWeb debe ser una URL HTTPS absoluta.',
//         400,
//         'INVALID_PUSH_URL',
//       );
//     }
//   }

//   // ------------------------------------------------------
//   // 2. Reclamar trabajo
//   // ------------------------------------------------------

//   const claimed = await claimNotification(
//     notificationId,
//     reintentar,
//   );

//   if (claimed.omitida) {
//     return {
//       id_notificacion: notificationId,
//       ...claimed,
//     };
//   }

//   const notification = claimed.notification;

//   try {
//     // ----------------------------------------------------
//     // 3. Obtener destinatarios
//     // ----------------------------------------------------

//     const recipients = await NotificacionUsuario.findAll({
//       where: {
//         id_notificacion: notificationId,
//       },
//       order: [
//         [
//           'id_notificacion_usuario',
//           'ASC',
//         ],
//       ],
//     });

//     if (!recipients.length) {
//       throw new Error(
//         'La notificación no tiene destinatarios.',
//       );
//     }

//     const summary = {
//       enviados: 0,
//       fallidos: 0,
//       pendientes: 0,
//       sin_dispositivo: 0,
//       socket_publicaciones: 0,
//       socket_errores: 0,
//     };

//     // ----------------------------------------------------
//     // 4. Procesar cada destinatario
//     // ----------------------------------------------------

//     for (const recipient of recipients) {
//       if (
//         !await canContinue(
//           notificationId,
//         )
//       ) {
//         break;
//       }

//       // --------------------------------------------------
//       // Canal interno: Socket.IO
//       // --------------------------------------------------
//       if (
//         notification.enviar_interna &&
//         io &&
//         !recipient.archivada &&
//         !recipient.leida
//       ) {
//         try {

//           const publication = await notificationEmitter(
//             io,
//             notification.id_notificacion,
//             {
//               id_usuario:
//                 recipient.id_usuario,

//               id_notificacion_usuario:
//                 recipient.id_notificacion_usuario,
//             },
//           );

//           if (publication.publicada) {
//             summary.socket_publicaciones++;
//           }


//         } catch (error) {
//           // summary.socket_errores++;

//           console.error(
//             '[notificacion:socket]',
//             notificationId,
//             error.name,
//           );
//         }
//       }

//       // --------------------------------------------------
//       // Canal push: Firebase
//       // --------------------------------------------------

//       const push = await sendRecipientPush(
//         notification,
//         recipient,
//         {
//           maxIntentos,
//           channelId,
//           urlWeb,
//         },
//       );

//       summary.enviados += push.enviados;

//       summary.fallidos += push.fallidos;

//       summary.pendientes += push.pendientes;

//       if (
//         push.sin_dispositivo
//       ) {
//         summary.sin_dispositivo++;
//       }
//     }

//     // ----------------------------------------------------
//     // 5. Finalizar sin sobrescribir una cancelación
//     // ----------------------------------------------------

//     const finalState = await sequelize.transaction(
//       async (transaction) => {
//         const current =
//           await Notificacion.findByPk(
//             notificationId,
//             {
//               transaction,

//               lock:
//                 transaction
//                   .LOCK.UPDATE,
//             },
//           );

//         if (
//           current.estado_notificacion !==
//           'PROCESANDO'
//         ) {
//           return current
//             .estado_notificacion;
//         }

//         if (isFuture(current)) {
//           await current.update(
//             {
//               estado_notificacion: 'PENDIENTE',
//             },
//             {
//               transaction,
//               hooks: false,
//             },
//           );

//           return 'PENDIENTE';
//         }

//         const pushComplete =
//           !notification.enviar_push ||
//           (
//             summary.fallidos === 0 &&
//             summary.pendientes === 0 &&
//             summary.sin_dispositivo === 0
//           );

//         /*
//          * La bandeja persistida está disponible
//          * aunque el usuario no tenga socket activo.
//          */
//         const state =
//           isExpired(current)
//             ? 'CANCELADA'
//             : pushComplete
//               ? 'ENVIADA'
//               : (
//                 notification.enviar_interna ||
//                 summary.enviados > 0
//               )
//                 ? 'PARCIAL'
//                 : 'FALLIDA';

//         await current.update(
//           {
//             estado_notificacion:
//               state,

//             fecha_procesamiento:
//               new Date(),
//           },
//           {
//             transaction,
//             hooks: false,
//           },
//         );

//         return state;
//       },
//     );

//     return {
//       id_notificacion: notificationId,
//       estado_notificacion: finalState,
//       reintento_pendiente: summary.pendientes > 0,
//       ...summary,
//     };
//   } catch (error) {
//     /*
//      * No cambiar automáticamente a FALLIDA:
//      * Firebase pudo aceptar un envío antes de un
//      * fallo al guardar el resultado en MySQL.
//      *
//      * Se conserva PROCESANDO para revisión.
//      */
//     // console.error(
//     //   '[notificacion:dispatch]',
//     //   notificationId,
//     //   error.name,
//     // );
//     console.error('[notificacion:dispatch]', {
//       id_notificacion: notificationId,
//       nombre: error.name,
//       codigo: error.code,
//       mensaje: error.message,
//       stack: error.stack,
//     });

//     throw error;
//   }
// };

// module.exports = dispatchNotificationService;