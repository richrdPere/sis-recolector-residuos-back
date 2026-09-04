const {
  createNotificationService,
  getMyNotificationsService,
  getMyNotificationByIdService,
  getUnreadCountService,
  markNotificationReadService,
  markAllNotificationsReadService,
  archiveNotificationService,
} = require('../services/notificaciones-internas');

// Utils
const {
  getAuthenticatedUserId,
  getRequestMetadata,
} = require(
  '../utils/notificacion-controller.utils',
);

// =======================================================
// Utilidad: Emitir notificación interna
// =======================================================

const emitInternalNotification = (
  req,
  result,
) => {
  const io =
    req.app.get('io');

  if (
    !io ||
    !result?.creada ||
    !result
      .notificacion
  ) {
    return;
  }

  const notification =
    result.notificacion;

  if (
    notification
      .enviar_interna !==
    true
  ) {
    return;
  }

  const recipients =
    notification
      .destinatarios ||
    [];

  for (
    const recipient
    of recipients
  ) {
    io
      .to(
        `usuario:${recipient.id_usuario}`,
      )
      .emit(
        'notificacion:nueva',
        {
          id_notificacion:
            notification
              .id_notificacion,

          id_notificacion_usuario:
            recipient
              .id_notificacion_usuario,

          tipo_notificacion:
            notification
              .tipo_notificacion,

          prioridad:
            notification
              .prioridad,

          titulo:
            notification
              .titulo,

          mensaje:
            notification
              .mensaje,

          tipo_entidad:
            notification
              .tipo_entidad,

          id_entidad:
            notification
              .id_entidad,

          datos:
            notification
              .datos,

          created_at:
            notification
              .created_at,
        },
      );
  }
};

/*
|--------------------------------------------------------------------------
| 1. Crear notificación administrativa
|--------------------------------------------------------------------------
*/
const createNotificationController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(
        req,
      );

    const data =
      await createNotificationService(
        {
          ...req.body,

          /*
          | El origen administrativo se controla
          | desde el backend.
          */

          origen:
            'WEB',
        },
        {
          id_usuario_creacion:
            metadata
              .id_usuario,
        },
      );

    /*
    | La transacción del service ya terminó.
    | Recién ahora emitimos mediante Socket.IO.
    */

    emitInternalNotification(
      req,
      data,
    );

    return res
      .status(
        data.duplicada
          ? 200
          : 201,
      )
      .json({
        success: true,
        message: data.duplicada
          ? 'La notificación ya había sido creada.'
          : 'Notificación creada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener mis notificaciones
|--------------------------------------------------------------------------
*/
const getMyNotificationsController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const {
      page = 1,
      limit = 20,
      leida = null,
      archivada = false,
      tipo_notificacion = null,
      prioridad = null,
      search = null,
    } = req.query;

    const data =
      await getMyNotificationsService({
        id_usuario:
          idUsuario,

        page,
        limit,
        leida,
        archivada,
        tipo_notificacion,
        prioridad,
        search,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: data.items.length
          ? 'Notificaciones obtenidas correctamente.'
          : 'No se encontraron notificaciones.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener detalle de mi notificación
|--------------------------------------------------------------------------
*/
const getMyNotificationByIdController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await getMyNotificationByIdService({
        id_notificacion_usuario:
          req.params.idNotificacionUsuario,
        id_usuario: idUsuario,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Notificación obtenida correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtener cantidad de no leídas
|--------------------------------------------------------------------------
*/
const getUnreadCountController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data = await getUnreadCountService(
      idUsuario,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Cantidad de notificaciones no leídas obtenida correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Marcar una notificación como leída
|--------------------------------------------------------------------------
*/
const markNotificationReadController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data = await markNotificationReadService({
      id_notificacion_usuario:
        req.params
          .idNotificacionUsuario,

      id_usuario:
        idUsuario,
    });

    const io =
      req.app.get('io');

    if (io) {
      io
        .to(
          `usuario:${idUsuario}`,
        )
        .emit(
          'notificacion:leida',
          {
            id_notificacion_usuario:
              data
                .id_notificacion_usuario,

            fecha_leida:
              data.fecha_leida,
          },
        );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: 'Notificación marcada como leída.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Marcar todas como leídas
|--------------------------------------------------------------------------
*/
const markAllNotificationsReadController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await markAllNotificationsReadService(
        idUsuario,
      );

    const io =
      req.app.get('io');

    if (io) {
      io
        .to(
          `usuario:${idUsuario}`,
        )
        .emit(
          'notificacion:todas-leidas',
          {
            actualizadas:
              data.actualizadas,
          },
        );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: data.actualizadas > 0
          ? 'Las notificaciones fueron marcadas como leídas.'
          : 'No existen notificaciones pendientes de lectura.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Archivar notificación
|--------------------------------------------------------------------------
*/
const archiveNotificationController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await archiveNotificationService({
        id_notificacion_usuario:
          req.params
            .idNotificacionUsuario,

        id_usuario:
          idUsuario,
      });

    const io =
      req.app.get('io');

    if (io) {
      io
        .to(
          `usuario:${idUsuario}`,
        )
        .emit(
          'notificacion:archivada',
          {
            id_notificacion_usuario:
              data
                .id_notificacion_usuario,

            fecha_archivada:
              data
                .fecha_archivada,
          },
        );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: 'Notificación archivada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createNotificationController,
  getMyNotificationsController,
  getMyNotificationByIdController,
  getUnreadCountController,
  markNotificationReadController,
  markAllNotificationsReadController,
  archiveNotificationController,
};