const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Validations
const {
  validateId,
  validateOptionalId,
  normalizeRequiredText,
  normalizeOptionalText,
  normalizeDate,
  normalizePriority,
  normalizeOrigin,
} = require('../../validations/notificacion.validation');

// Utils
const { getNotificationDetail } = require('../../utils/notificacion-service.utils');

// Modelos
const {
  Usuario,
  Notificacion,
  NotificacionUsuario,
  sequelize,
} = db;

// =======================================================
// Service: Crear notificación
// =======================================================
const createNotificationService = async ({
  tipo_notificacion,
  titulo,
  mensaje,
  destinatarios = [],
  prioridad = 'NORMAL',
  enviar_interna = true,
  enviar_push = false,
  tipo_entidad = null,
  id_entidad = null,
  datos = null,
  clave_evento = null,
  fecha_programada = null,
  fecha_expiracion = null,
  origen = 'SISTEMA',
},
  {
    id_usuario_creacion = null,
    transaction:
    externalTransaction =
    null,
  } = {},
) => {
  const creatorId = validateOptionalId(
    id_usuario_creacion,
    'identificador del usuario creador',
  );

  const notificationType = normalizeRequiredText(
    tipo_notificacion,
    'tipo de notificación',
    60,
  ).toUpperCase();

  const normalizedTitle = normalizeRequiredText(
    titulo,
    'título',
    150,
  );

  const normalizedMessage = normalizeRequiredText(
    mensaje,
    'mensaje',
  );

  const normalizedEntityType = normalizeOptionalText(
    tipo_entidad,
    'tipo de entidad',
    50,
  )?.toUpperCase() ||
    null;

  const entityId = validateOptionalId(
    id_entidad,
    'identificador de la entidad',
  );

  if (
    (
      normalizedEntityType ===
      null
    ) !==
    (
      entityId === null
    )
  ) {
    throw new AppError(
      'El tipo y el identificador de la entidad deben enviarse juntos.',
      400,
      'INCOMPLETE_RELATED_ENTITY',
    );
  }

  if (
    enviar_interna !== true &&
    enviar_push !== true
  ) {
    throw new AppError(
      'La notificación debe utilizar al menos un canal.',
      400,
      'NOTIFICATION_CHANNEL_REQUIRED',
    );
  }

  if (
    !Array.isArray(
      destinatarios,
    ) ||
    !destinatarios.length
  ) {
    throw new AppError(
      'Debe indicar al menos un destinatario.',
      400,
      'NOTIFICATION_RECIPIENT_REQUIRED',
    );
  }

  const recipientIds = [
    ...new Set(
      destinatarios.map(
        (
          recipientId,
        ) =>
          validateId(
            recipientId,
            'identificador del destinatario',
          ),
      ),
    ),
  ];

  const scheduledDate =
    normalizeDate(
      fecha_programada,
      'fecha programada',
    );

  const expirationDate =
    normalizeDate(
      fecha_expiracion,
      'fecha de expiración',
    );

  if (
    scheduledDate &&
    expirationDate &&
    expirationDate <=
    scheduledDate
  ) {
    throw new AppError(
      'La fecha de expiración debe ser posterior a la fecha programada.',
      400,
      'INVALID_NOTIFICATION_DATE_RANGE',
    );
  }

  const eventKey =
    normalizeOptionalText(
      clave_evento,
      'clave del evento',
      150,
    );

  /*
  |--------------------------------------------------------------------------
  | Idempotencia
  |--------------------------------------------------------------------------
  */

  if (eventKey) {
    const existing =
      await Notificacion
        .findOne({
          where: {
            clave_evento:
              eventKey,
          },

          transaction:
            externalTransaction,
        });

    if (existing) {
      const detail =
        await getNotificationDetail(
          existing
            .id_notificacion,
          {
            transaction:
              externalTransaction,
          },
        );

      return {
        notificacion:
          detail,

        creada:
          false,

        duplicada:
          true,
      };
    }
  }

  const ownTransaction =
    !externalTransaction;

  const transaction =
    externalTransaction ||
    await sequelize.transaction();

  try {
    /*
    |--------------------------------------------------------------------------
    | Confirmar destinatarios
    |--------------------------------------------------------------------------
    */

    const users =
      await Usuario.findAll({
        where: {
          id_usuario: {
            [Op.in]:
              recipientIds,
          },
        },

        attributes: [
          'id_usuario',
        ],

        transaction,
      });

    if (
      users.length !==
      recipientIds.length
    ) {
      const foundIds =
        new Set(
          users.map(
            (
              user,
            ) =>
              Number(
                user.id_usuario,
              ),
          ),
        );

      const missingIds =
        recipientIds.filter(
          (
            id,
          ) =>
            !foundIds.has(id),
        );

      throw new AppError(
        `No se encontraron los destinatarios: ${missingIds.join(', ')}.`,
        404,
        'NOTIFICATION_RECIPIENTS_NOT_FOUND',
      );
    }

    const now =
      new Date();

    const isScheduled =
      scheduledDate &&
      scheduledDate > now;

    const initialState =
      isScheduled ||
        enviar_push
        ? 'PENDIENTE'
        : 'ENVIADA';

    const notification =
      await Notificacion
        .create(
          {
            id_usuario_creacion:
              creatorId,

            tipo_notificacion:
              notificationType,

            prioridad:
              normalizePriority(
                prioridad,
              ),

            titulo:
              normalizedTitle,

            mensaje:
              normalizedMessage,

            enviar_interna:
              enviar_interna ===
              true,

            enviar_push:
              enviar_push ===
              true,

            tipo_entidad:
              normalizedEntityType,

            id_entidad:
              entityId,

            datos,

            clave_evento:
              eventKey,

            fecha_programada:
              scheduledDate,

            fecha_expiracion:
              expirationDate,

            estado_notificacion:
              initialState,

            origen:
              normalizeOrigin(
                origen,
              ),

            fecha_procesamiento:
              initialState ===
                'ENVIADA'
                ? now
                : null,
          },
          {
            transaction,
          },
        );

    await NotificacionUsuario
      .bulkCreate(
        recipientIds.map(
          (
            userId,
          ) => ({
            id_notificacion:
              notification
                .id_notificacion,

            id_usuario:
              userId,

            leida:
              false,

            archivada:
              false,

            estado_push:
              enviar_push
                ? 'PENDIENTE'
                : 'NO_REQUERIDO',
          }),
        ),
        {
          transaction,
          validate:
            true,
        },
      );

    const detail =
      await getNotificationDetail(
        notification
          .id_notificacion,
        {
          transaction,
        },
      );

    if (ownTransaction) {
      await transaction
        .commit();
    }

    return {
      notificacion:
        detail,

      creada:
        true,

      duplicada:
        false,
    };
  } catch (error) {
    if (
      ownTransaction &&
      !transaction.finished
    ) {
      await transaction
        .rollback();
    }

    /*
    | Protección final ante dos solicitudes
    | concurrentes con la misma clave.
    */

    if (
      ownTransaction &&
      eventKey &&
      error.name ===
      'SequelizeUniqueConstraintError'
    ) {
      const existing =
        await Notificacion
          .findOne({
            where: {
              clave_evento:
                eventKey,
            },
          });

      if (existing) {
        return {
          notificacion:
            await getNotificationDetail(
              existing
                .id_notificacion,
            ),

          creada:
            false,

          duplicada:
            true,
        };
      }
    }

    throw error;
  }
};

module.exports = createNotificationService;

// TODO:  Después de crear una programación y conocer los usuarios asignados:

// await createNotificationService(
//   {
//     tipo_notificacion:
//       'ASIGNACION_RUTA',

//     titulo:
//       'Nueva ruta asignada',

//     mensaje:
//       'Se le asignó una nueva ruta de recolección.',

//     destinatarios: [
//       idUsuarioConductor,
//       ...usuariosRecolectores,
//     ],

//     prioridad:
//       'ALTA',

//     enviar_interna:
//       true,

//     enviar_push:
//       false,

//     tipo_entidad:
//       'PROGRAMACION',

//     id_entidad:
//       programacion
//         .id_programacion,

//     datos: {
//       id_programacion:
//         programacion
//           .id_programacion,

//       fecha_programada:
//         programacion
//           .fecha_programada,
//     },

//     clave_evento:
//       `ASIGNACION_RUTA:PROGRAMACION:${programacion.id_programacion}`,

//     origen:
//       'SISTEMA',
//   },
//   {
//     id_usuario_creacion:
//       creatorId,

//     transaction,
//   },
// );