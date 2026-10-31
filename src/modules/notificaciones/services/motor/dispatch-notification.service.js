// Database
const db = require('../../../../database/models');

// Utils
const AppError = require('../../../../utils/app-error');
const { claimNotification, sendRecipientPush, isFuture, isExpired } = require("../../utils/motor-notification.utils");

// Socket.IO
const { getIO } = require('../../../../socket');
const { emitToUser } = require('../../../../socket/usuarios-manager');

// Modelos
const {
  sequelize,
  Notificacion,
  NotificacionUsuario,
} = db;


// ==========================================================
// SERVICE: DESPACHAR NOTIFICACIÓN
// ==========================================================
//
// Debe ejecutarse después del commit de la creación.
//
// reintentar:
//   Permite procesar PARCIAL y FALLIDA.
//   No fuerza reenvíos exitosos ni elimina la espera.
//
// maxIntentos:
//   Máximo por dispositivo.
//
// Importante:
//   PROCESANDO no se recupera automáticamente.
//   Requiere revisión cuando el proceso se interrumpe.
//

const dispatchNotificationService = async ({
  id_notificacion,

  io = getIO(),

  reintentar = false,

  maxIntentos = 3,

  channelId = process.env.FCM_ANDROID_CHANNEL_ID || 'recoleccion_alertas',

  urlWeb = null,
} = {}) => {
  const notificationId =
    validateId(
      id_notificacion,
    );

  // ------------------------------------------------------
  // 1. Validar opciones
  // ------------------------------------------------------

  if (
    typeof reintentar !==
    'boolean' ||
    !Number.isInteger(
      maxIntentos,
    ) ||
    maxIntentos < 1 ||
    maxIntentos > 10 ||
    typeof channelId !==
    'string' ||
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
      const url =
        new URL(urlWeb);

      if (
        url.protocol !==
        'https:'
      ) {
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

  // ------------------------------------------------------
  // 2. Reclamar trabajo
  // ------------------------------------------------------

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

  try {
    // ----------------------------------------------------
    // 3. Obtener destinatarios
    // ----------------------------------------------------

    const recipients = await NotificacionUsuario.findAll({
      where: {
        id_notificacion: notificationId,
      },
      order: [
        [
          'id_notificacion_usuario',
          'ASC',
        ],
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

    // ----------------------------------------------------
    // 4. Procesar cada destinatario
    // ----------------------------------------------------

    for (const recipient of recipients) {
      if (
        !await canContinue(
          notificationId,
        )
      ) {
        break;
      }

      // --------------------------------------------------
      // Canal interno: Socket.IO
      // --------------------------------------------------
      if (
        notification.enviar_interna &&
        io &&
        !recipient.archivada &&
        !recipient.leida
      ) {
        try {
          await emitToUser(
            io,
            recipient.id_usuario,
            'notificacion:nueva',
            {
              id_notificacion: idString(
                notification
                  .id_notificacion,
              ),

              id_notificacion_usuario: idString(
                recipient
                  .id_notificacion_usuario,
              ),

              tipo_notificacion: notification.tipo_notificacion,

              prioridad: notification.prioridad,

              titulo: notification.titulo,

              mensaje: notification.mensaje,

              tipo_entidad: notification.tipo_entidad,

              id_entidad: notification.id_entidad,

              datos: notification.datos,

              created_at: notification.created_at,

              refrescar: true,
            },
          );

          /*
           * Cuenta publicaciones intentadas.
           * No representa acuses de recepción.
           */
          summary
            .socket_publicaciones++;
        } catch (error) {
          summary.socket_errores++;

          console.error(
            '[notificacion:socket]',
            notificationId,
            error.name,
          );
        }
      }

      // --------------------------------------------------
      // Canal push: Firebase
      // --------------------------------------------------

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

      if (
        push.sin_dispositivo
      ) {
        summary.sin_dispositivo++;
      }
    }

    // ----------------------------------------------------
    // 5. Finalizar sin sobrescribir una cancelación
    // ----------------------------------------------------

    const finalState = await sequelize.transaction(
      async (transaction) => {
        const current =
          await Notificacion.findByPk(
            notificationId,
            {
              transaction,

              lock:
                transaction
                  .LOCK.UPDATE,
            },
          );

        if (
          current.estado_notificacion !==
          'PROCESANDO'
        ) {
          return current
            .estado_notificacion;
        }

        if (isFuture(current)) {
          await current.update(
            {
              estado_notificacion: 'PENDIENTE',
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

        /*
         * La bandeja persistida está disponible
         * aunque el usuario no tenga socket activo.
         */
        const state =
          isExpired(current)
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
            estado_notificacion:
              state,

            fecha_procesamiento:
              new Date(),
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
      reintento_pendiente: summary.pendientes > 0,
      ...summary,
    };
  } catch (error) {
    /*
     * No cambiar automáticamente a FALLIDA:
     * Firebase pudo aceptar un envío antes de un
     * fallo al guardar el resultado en MySQL.
     *
     * Se conserva PROCESANDO para revisión.
     */
    console.error(
      '[notificacion:dispatch]',
      notificationId,
      error.name,
    );

    throw error;
  }
};

module.exports = dispatchNotificationService;