const { Op } = require('sequelize');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Services
const getProgramacionByIdService = require('./get-programacion-by-id.service');
const crearAvisoCiudadano = require('../../../notificaciones/services/ciudadanos/crear-aviso-ciudadano.service');

// Motor de notificaciones
const { enqueueNotification } = require('../../../../jobs/notification-worker');

// Utils
const {
  validateId,
  registerHistory,
} = require('../../utils/programacion-service.utils');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  Notificacion,
  sequelize,
} = db;

// ==========================================================
// SERVICE: CANCELAR PROGRAMACIÓN
// ==========================================================

const cancelProgramacionService = async (
  idProgramacion,
  {
    motivo_cancelacion,
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const actorId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const reason = String(
    motivo_cancelacion || '',
  ).trim();

  if (!reason) {
    throw new AppError(
      'El motivo de cancelación es obligatorio.',
      400,
      'CANCELLATION_REASON_REQUIRED',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 2. Obtener y bloquear programación
    // ------------------------------------------------------

    const programacion =
      await ProgramacionRuta.findByPk(
        id,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        },
      );

    if (!programacion) {
      throw new AppError(
        'La programación no fue encontrada.',
        404,
        'PROGRAMMING_NOT_FOUND',
      );
    }

    if (
      [
        'FINALIZADA',
        'CANCELADA',
      ].includes(
        programacion.estado_programacion,
      )
    ) {
      throw new AppError(
        'La programación no puede cancelarse.',
        409,
        'PROGRAMMING_CANNOT_BE_CANCELLED',
      );
    }

    const previousState =
      programacion.estado_programacion;

    // ------------------------------------------------------
    // 3. Obtener destinatarios ANTES de retirar asignaciones
    // ------------------------------------------------------

    const assignments =
      await ProgramacionPersonal.findAll({
        where: {
          id_programacion: id,

          estado_asignacion: {
            [Op.notIn]: [
              'RECHAZADO',
              'RETIRADO',
              'FINALIZADO',
            ],
          },
        },

        attributes: [
          'id_personal',
        ],

        transaction,
      });

    const personalIds = [
      ...new Set(
        assignments.map(
          (assignment) =>
            assignment.id_personal,
        ),
      ),
    ];

    let recipientIds = [];

    if (personalIds.length > 0) {
      const personal =
        await PersonalOperativo.findAll({
          where: {
            id_personal: {
              [Op.in]: personalIds,
            },
          },

          attributes: [
            'id_personal',
            'id_usuario',
          ],

          transaction,
        });

      recipientIds = [
        ...new Set(
          personal
            .filter(
              (member) =>
                member.id_usuario != null,
            )
            .map(
              (member) =>
                String(member.id_usuario),
            ),
        ),
      ];
    }

    // ------------------------------------------------------
    // 4. Cancelar programación
    // ------------------------------------------------------

    const cancellationDate =
      new Date();

    await programacion.update(
      {
        estado_programacion:
          'CANCELADA',

        motivo_cancelacion:
          reason,

        fecha_cancelacion:
          cancellationDate,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 5. Retirar asignaciones
    // ------------------------------------------------------

    await ProgramacionPersonal.update(
      {
        estado_asignacion:
          'RETIRADO',

        observacion:
          'Asignación retirada por cancelación de la programación.',
      },
      {
        where: {
          id_programacion: id,

          estado_asignacion: {
            [Op.notIn]: [
              'FINALIZADO',
              'RETIRADO',
            ],
          },
        },

        transaction,
      },
    );

    // ------------------------------------------------------
    // 6. Cancelar avisos anteriores todavía pendientes
    // ------------------------------------------------------

    /*
     * Evita despachar asignaciones, actualizaciones o
     * recordatorios pendientes de una programación cancelada.
     *
     * Los avisos ya ENVIADA se conservan como historial.
     *
     * El nuevo aviso de cancelación se crea después
     * de esta operación.
     */
    await Notificacion.update(
      {
        estado_notificacion:
          'CANCELADA',

        fecha_procesamiento:
          cancellationDate,
      },
      {
        where: {
          tipo_entidad:
            'PROGRAMACION',

          id_entidad:
            id,

          estado_notificacion: {
            [Op.in]: [
              'PENDIENTE',
              'PROCESANDO',
              'PARCIAL',
              'FALLIDA',
            ],
          },
        },

        transaction,
        hooks: false,
      },
    );

    // ------------------------------------------------------
    // 7. Registrar historial
    // ------------------------------------------------------
    await registerHistory({
      id_programacion: id,
      id_usuario: actorId,
      tipo_evento: 'CANCELACION',
      estado_anterior: previousState,
      estado_nuevo: 'CANCELADA',
      observacion: reason,

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Encolar aviso de cancelación al equipo
    // ------------------------------------------------------

    if (recipientIds.length > 0) {
      // Limitar el texto visible del push.
      const visibleReason =
        reason.length > 300
          ? `${reason.slice(0, 297)}...`
          : reason;

      await enqueueNotification({
        notificacion: {
          tipo_notificacion:
            'PROGRAMACION_CANCELADA',

          titulo:
            'Tu programación fue cancelada',

          mensaje:
            `Se canceló tu programación de recolección ` +
            `del ${programacion.fecha_programada}, ` +
            `de ${programacion.hora_inicio_programada} ` +
            `a ${programacion.hora_fin_programada}. ` +
            `Motivo: ${visibleReason}`,

          prioridad:
            'ALTA',

          enviar_interna: true,
          enviar_push: true,

          tipo_entidad:
            'PROGRAMACION',

          id_entidad:
            programacion.id_programacion,

          datos: {
            id_programacion:
              programacion.id_programacion,

            id_ruta:
              programacion.id_ruta,

            fecha_programada:
              programacion.fecha_programada,

            hora_inicio_programada:
              programacion.hora_inicio_programada,

            hora_fin_programada:
              programacion.hora_fin_programada,

            estado_programacion:
              'CANCELADA',

            motivo_cancelacion:
              reason,

            fecha_cancelacion:
              cancellationDate.toISOString(),
          },

          clave_evento:
            `CANCELACION:PROGRAMACION:` +
            programacion.id_programacion,

          origen:
            'SISTEMA',
        },

        destino: {
          tipo_destino:
            'USUARIOS',

          destinatarios:
            recipientIds,
        },

        id_usuario_creacion:
          actorId,

        transaction,
      });
    }


    await crearAvisoCiudadano({
      evento: 'CANCELACION',
      idRuta: programacion.id_ruta,
      tipoEntidad: 'PROGRAMACION',
      idEntidad: id,
      claveEvento: `CANCELACION_PROGRAMACION:CIUDADANOS:${id}`,
      titulo: 'Servicio de recolección cancelado',
      mensaje:
        `El servicio del ${programacion.fecha_programada}, ` +
        `de ${programacion.hora_inicio_programada} ` +
        `a ${programacion.hora_fin_programada}, fue cancelado. ` +
        'Consulta el calendario de tu domicilio.',
      prioridad: 'ALTA',
      datos: {
        id_programacion: id,
        fecha_programada: programacion.fecha_programada,
        estado_programacion: 'CANCELADA',
      },
      fechaEvento: cancellationDate,
      idUsuarioCreacion: actorId,
      transaction,
    });
    // ------------------------------------------------------
    // 9. Confirmar cancelación y avisos
    // ------------------------------------------------------

    await transaction.commit();

    // El worker enviará el nuevo aviso después del commit.
    try {
      return await getProgramacionByIdService(id);
    } catch (error) {
      return {
        id_programacion: id,

        estado_programacion:
          'CANCELADA',

        mensaje:
          'La programación fue cancelada, pero no se pudo recuperar su detalle.',
      };
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = cancelProgramacionService;

// const { Op } = require('sequelize');
// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Service
// const getProgramacionByIdService = require("./get-programacion-by-id.service");

// // Utils
// const {
//   validateId,
//   registerHistory,
// } = require("../../utils/programacion-service.utils");

// // Modelos
// const {
//   ProgramacionRuta,
//   ProgramacionPersonal,
//   sequelize,
// } = db;

// // ===============================================
// // SERVICE: Cancelar programacion
// // ===============================================
// const cancelProgramacionService = async (
//   idProgramacion,
//   {
//     motivo_cancelacion,
//     id_usuario,
//     ip = null,
//     user_agent = null,
//   },
// ) => {
//   const id = validateId(
//     idProgramacion,
//     'identificador de la programación',
//   );

//   const reason =
//     String(
//       motivo_cancelacion ||
//       '',
//     ).trim();

//   if (!reason) {
//     throw new AppError(
//       'El motivo de cancelación es obligatorio.',
//       400,
//       'CANCELLATION_REASON_REQUIRED',
//     );
//   }

//   const transaction =
//     await sequelize.transaction();

//   try {
//     const programacion =
//       await ProgramacionRuta
//         .findByPk(id, {
//           transaction,
//           lock:
//             transaction.LOCK
//               .UPDATE,
//         });

//     if (!programacion) {
//       throw new AppError(
//         'La programación no fue encontrada.',
//         404,
//         'PROGRAMMING_NOT_FOUND',
//       );
//     }

//     if (
//       [
//         'FINALIZADA',
//         'CANCELADA',
//       ].includes(
//         programacion
//           .estado_programacion,
//       )
//     ) {
//       throw new AppError(
//         'La programación no puede cancelarse.',
//         409,
//         'PROGRAMMING_CANNOT_BE_CANCELLED',
//       );
//     }

//     const previousState =
//       programacion
//         .estado_programacion;

//     await programacion.update(
//       {
//         estado_programacion:
//           'CANCELADA',

//         motivo_cancelacion:
//           reason,

//         fecha_cancelacion:
//           new Date(),
//       },
//       {
//         transaction,
//       },
//     );

//     await ProgramacionPersonal
//       .update(
//         {
//           estado_asignacion: 'RETIRADO',
//           observacion: 'Asignación retirada por cancelación de la programación.',
//         },
//         {
//           where: {
//             id_programacion:              id,
//             estado_asignacion: {
//               [Op.notIn]: [
//                 'FINALIZADO',
//                 'RETIRADO',
//               ],
//             },
//           },

//           transaction,
//         },
//       );

//     await registerHistory({
//       id_programacion: id,
//       id_usuario,
//       tipo_evento: 'CANCELACION',
//       estado_anterior: previousState,
//       estado_nuevo: 'CANCELADA',
//       observacion: reason,
//       ip,
//       user_agent,
//       transaction,
//     });

//     await transaction.commit();

//     return getProgramacionByIdService(id);
//   } catch (error) {
//     if (!transaction.finished) {
//       await transaction.rollback();
//     }

//     throw error;
//   }
// };

// module.exports = cancelProgramacionService;