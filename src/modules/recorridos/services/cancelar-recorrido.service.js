const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../jobs/notification-worker');

// Constants
const {
  ESTADOS_RECORRIDO,
  ESTADOS_PROGRAMACION,
  ESTADOS_VEHICULO,
  ESTADOS_RECORRIDO_ACTIVO,
  TIPOS_EVENTO_RECORRIDO,
} = require('../utils/recorrido.constants');

// Validations
const {
  validateId,
  validateCoordinates,
  validateEventDate,
  validateIdempotencyKey,
  normalizeOrigin,
  validateObservation,
} = require('../validations/recorrido.validation');

// Utils
const {
  getRecorridoOrFail,
  getProgramacionOrFail,
  getVehiculoOrFail,
  createRecorridoEvent,
  getRecorridoDetail,
} = require('../utils/recorrido-service.utils');

// Modelos
const {
  Notificacion,
  sequelize,
} = db;

// ==========================================================
// SERVICE: CANCELAR RECORRIDO
// ==========================================================

const cancelarRecorridoService = async ({
  id_recorrido,
  id_usuario,
  motivo,
  fecha_evento = null,
  latitud = null,
  longitud = null,
  observacion = null,
  clave_idempotencia = null,
  origen = 'WEB',
  ip = null,
  user_agent = null,
}) => {
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  const recorridoId = validateId(
    id_recorrido,
    'identificador del recorrido',
  );

  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const normalizedReason =
    validateObservation(
      motivo,
      true,
    );

  const location =
    validateCoordinates({
      latitud,
      longitud,
    });

  const eventDate =
    validateEventDate(fecha_evento);

  const idempotencyKey =
    validateIdempotencyKey(
      clave_idempotencia,
    );

  const eventOrigin =
    normalizeOrigin(origen);

  const transaction =
    await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 2. Obtener y bloquear recorrido
    // ------------------------------------------------------

    const recorrido =
      await getRecorridoOrFail(
        recorridoId,
        transaction,
        true,
      );

    if (
      !ESTADOS_RECORRIDO_ACTIVO.includes(
        recorrido.estado_recorrido,
      )
    ) {
      throw new AppError(
        'El recorrido no se encuentra activo.',
        409,
        'ROUTE_EXECUTION_CANNOT_CANCEL',
      );
    }

    // ------------------------------------------------------
    // 3. Obtener programación y vehículo
    // ------------------------------------------------------

    const programacion =
      await getProgramacionOrFail(
        recorrido.id_programacion,
        transaction,
        true,
      );

    const vehiculo =
      await getVehiculoOrFail(
        programacion.id_vehiculo,
        transaction,
        true,
      );

    // ------------------------------------------------------
    // 4. Cancelar recorrido
    // ------------------------------------------------------

    await recorrido.update(
      {
        id_usuario_finalizacion:
          userId,

        estado_recorrido:
          ESTADOS_RECORRIDO.CANCELADO,

        fecha_hora_finalizacion:
          eventDate,

        motivo_cancelacion:
          normalizedReason,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 5. Cancelar programación
    // ------------------------------------------------------

    await programacion.update(
      {
        estado_programacion:
          ESTADOS_PROGRAMACION.CANCELADA,

        motivo_cancelacion:
          normalizedReason,

        fecha_cancelacion:
          eventDate,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 6. Actualizar vehículo
    // ------------------------------------------------------

    await vehiculo.update(
      {
        estado_operativo:
          ESTADOS_VEHICULO.DISPONIBLE,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 7. Registrar evento de cancelación
    // ------------------------------------------------------

    await createRecorridoEvent({
      id_recorrido:
        recorridoId,

      id_usuario:
        userId,

      tipo_evento:
        TIPOS_EVENTO_RECORRIDO.CANCELACION,

      fecha_evento:
        eventDate,

      latitud:
        location.latitud,

      longitud:
        location.longitud,

      observacion:
        normalizedReason,

      clave_idempotencia:
        idempotencyKey,

      origen:
        eventOrigin,

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Cancelar avisos anteriores pendientes
    // ------------------------------------------------------

    /*
     * Incluye avisos de inicio, asignación, actualización
     * y recordatorios asociados a estas entidades.
     *
     * Los nuevos avisos de cancelación se crean después.
     * Los avisos ya ENVIADA se conservan como historial.
     */
    await Notificacion.update(
      {
        estado_notificacion:
          'CANCELADA',

        fecha_procesamiento:
          new Date(),
      },
      {
        where: {
          estado_notificacion: {
            [Op.in]: [
              'PENDIENTE',
              'PROCESANDO',
              'PARCIAL',
              'FALLIDA',
            ],
          },

          [Op.or]: [
            {
              tipo_entidad:
                'RECORRIDO',

              id_entidad:
                recorridoId,
            },
            {
              tipo_entidad:
                'PROGRAMACION',

              id_entidad:
                programacion.id_programacion,
            },
          ],
        },

        transaction,
        hooks: false,
      },
    );

    // ------------------------------------------------------
    // 9. Aviso operativo
    // ------------------------------------------------------

    const operationalRecipients = [
      ...new Set(
        [
          programacion.id_usuario_creacion,
          recorrido.id_usuario_inicio,
        ]
          .filter(
            (id) => id != null,
          )
          .map(String)
          .filter(
            (id) => id !== String(userId),
          ),
      ),
    ];

    if (
      operationalRecipients.length > 0
    ) {
      const visibleReason =
        normalizedReason.length > 300
          ? `${normalizedReason.slice(0, 297)}...`
          : normalizedReason;

      await enqueueNotification({
        notificacion: {
          tipo_notificacion:
            'RECORRIDO_CANCELADO',

          titulo:
            'Recorrido cancelado',

          mensaje:
            `Se canceló el recorrido de la programación ` +
            `del ${programacion.fecha_programada}. ` +
            `Motivo: ${visibleReason}`,

          prioridad:
            'ALTA',

          enviar_interna: true,
          enviar_push: true,

          tipo_entidad:
            'RECORRIDO',

          id_entidad:
            recorridoId,

          datos: {
            id_recorrido:
              recorridoId,

            id_programacion:
              programacion.id_programacion,

            id_ruta:
              programacion.id_ruta,

            id_vehiculo:
              programacion.id_vehiculo,

            estado_recorrido:
              ESTADOS_RECORRIDO.CANCELADO,

            motivo_cancelacion:
              normalizedReason,

            fecha_hora_finalizacion:
              eventDate,
          },

          clave_evento:
            'CANCELACION_RECORRIDO:OPERATIVO:' +
            recorridoId,

          origen:
            'SISTEMA',
        },

        destino: {
          tipo_destino:
            'USUARIOS',

          destinatarios:
            operationalRecipients,
        },

        id_usuario_creacion:
          userId,

        transaction,
      });
    }

    // ------------------------------------------------------
    // 10. Aviso ciudadano
    // ------------------------------------------------------

    await enqueueNotification({
      notificacion: {
        tipo_notificacion:
          'CANCELACION_RUTA',

        titulo:
          'Servicio de recolección interrumpido',

        mensaje:
          'El recorrido de recolección de tu ruta ' +
          'fue cancelado. Consulta los avisos y ' +
          'el estado del servicio en la aplicación.',

        prioridad: 'ALTA',

        enviar_interna: true,
        enviar_push: true,

        tipo_entidad: 'RECORRIDO',

        id_entidad: recorridoId,

        /*
         * No publicar coordenadas, observaciones
         * ni motivos operativos internos.
         */
        datos: {
          id_recorrido: recorridoId,
          id_programacion: programacion.id_programacion,
          id_ruta: programacion.id_ruta,
          estado_recorrido: ESTADOS_RECORRIDO.CANCELADO,
          fecha_cancelacion: eventDate,
        },
        clave_evento: 'CANCELACION_RECORRIDO:CIUDADANOS:' + recorridoId,
        origen: 'SISTEMA',
      },

      destino: {
        tipo_destino: 'CIUDADANOS',
        evento: 'CANCELACION',
        id_ruta: programacion.id_ruta,
      },

      id_usuario_creacion: userId,

      transaction,
    });

    // ------------------------------------------------------
    // 11. Confirmar cancelación y avisos
    // ------------------------------------------------------

    await transaction.commit();

    // El worker enviará los avisos confirmados.
    return getRecorridoDetail(
      recorridoId,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = cancelarRecorridoService;

// const db = require('../../../database/models');
// const AppError = require('../../../utils/app-error');

// // Constants
// const {
//   ESTADOS_RECORRIDO,
//   ESTADOS_PROGRAMACION,
//   ESTADOS_VEHICULO,
//   ESTADOS_RECORRIDO_ACTIVO,
//   TIPOS_EVENTO_RECORRIDO,
// } = require('../utils/recorrido.constants');

// // Validations
// const {
//   validateId,
//   validateCoordinates,
//   validateEventDate,
//   validateIdempotencyKey,
//   normalizeOrigin,
//   validateObservation,
// } = require('../validations/recorrido.validation'
// );

// // Utils
// const {
//   getRecorridoOrFail,
//   getProgramacionOrFail,
//   getVehiculoOrFail,
//   createRecorridoEvent,
//   getRecorridoDetail,
// } = require(
//   '../utils/recorrido-service.utils',
// );

// // Modelos
// const {
//   sequelize,
// } = db;

// // =======================================================
// // Service: Cancelar recorrido
// // =======================================================
// const cancelarRecorridoService = async ({
//   id_recorrido,
//   id_usuario,
//   motivo,
//   fecha_evento = null,
//   latitud = null,
//   longitud = null,
//   observacion = null,
//   clave_idempotencia = null,
//   origen = 'WEB',
//   ip = null,
//   user_agent = null,
// }) => {
//   const recorridoId = validateId(
//     id_recorrido,
//     'identificador del recorrido',
//   );

//   const userId = validateId(
//     id_usuario,
//     'identificador del usuario',
//   );

//   const normalizedReason = validateObservation(
//     motivo,
//     true,
//   );

//   const location = validateCoordinates({
//     latitud,
//     longitud,
//   });

//   const eventDate = validateEventDate(
//     fecha_evento,
//   );

//   const transaction = await sequelize.transaction();

//   try {
//     const recorrido = await getRecorridoOrFail(
//       recorridoId,
//       transaction,
//       true,
//     );

//     if (
//       !ESTADOS_RECORRIDO_ACTIVO
//         .includes(
//           recorrido.estado_recorrido,
//         )
//     ) {
//       throw new AppError(
//         'El recorrido no se encuentra activo.',
//         409,
//         'ROUTE_EXECUTION_CANNOT_CANCEL',
//       );
//     }

//     const programacion = await getProgramacionOrFail(
//       recorrido.id_programacion,
//       transaction,
//       true,
//     );

//     const vehiculo = await getVehiculoOrFail(
//       programacion.id_vehiculo,
//       transaction,
//       true,
//     );

//     await recorrido.update(
//       {
//         id_usuario_finalizacion: userId,
//         estado_recorrido: ESTADOS_RECORRIDO.CANCELADO,
//         fecha_hora_finalizacion: eventDate,
//         motivo_cancelacion: normalizedReason,
//       },
//       {
//         transaction,
//       },
//     );

//     await programacion.update(
//       {
//         estado_programacion: ESTADOS_PROGRAMACION.CANCELADA,
//         motivo_cancelacion: normalizedReason,
//         fecha_cancelacion: eventDate,
//       },
//       {
//         transaction,
//       },
//     );

//     await vehiculo.update(
//       {
//         estado_operativo:
//           ESTADOS_VEHICULO.DISPONIBLE,
//       },
//       {
//         transaction,
//       },
//     );

//     await createRecorridoEvent({
//       id_recorrido:
//         recorridoId,
//       id_usuario:
//         userId,
//       tipo_evento:
//         TIPOS_EVENTO_RECORRIDO
//           .CANCELACION,
//       fecha_evento:
//         eventDate,
//       latitud:
//         location.latitud,
//       longitud:
//         location.longitud,
//       observacion:
//         normalizedReason,
//       clave_idempotencia:
//         validateIdempotencyKey(
//           clave_idempotencia,
//         ),
//       origen:
//         normalizeOrigin(origen),
//       ip,
//       user_agent,
//       transaction,
//     });

//     await transaction.commit();

//     return getRecorridoDetail(
//       recorridoId,
//     );
//   } catch (error) {
//     if (!transaction.finished) {
//       await transaction.rollback();
//     }

//     throw error;
//   }
// };

// module.exports = cancelarRecorridoService;