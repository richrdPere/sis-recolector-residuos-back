const { randomUUID } = require('node:crypto');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Motor de notificaciones
const { enqueueNotification } = require('../../../../jobs/notification-worker');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  sequelize,
} = db;

// Utils
const recalculateProgrammingState = require('../../utils/programacion-personal.utils');

const {
  validateId,
  registerHistory,
} = require('../../utils/programacion-service.utils');

// Auditoría
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');

// ==========================================================
// SERVICE: RETIRAR PERSONAL DE LA PROGRAMACIÓN
// ==========================================================

const removeProgramacionPersonalService = async (
  idProgramacion,
  idAsignacion,
  {
    observacion = null,
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  const programmingId = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const assignmentId = validateId(
    idAsignacion,
    'identificador de la asignación',
  );

  const actorId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  if (observacion !== null && typeof observacion !== 'string') {
    throw new AppError(
      'La observación debe ser un texto.',
      400,
      'INVALID_REMOVAL_OBSERVATION',
    );
  }

  const removalReason = observacion?.trim() || 'Personal retirado de la programación.';

  if (removalReason.length > 1000) {
    throw new AppError(
      'El motivo de retiro no puede superar los 1000 caracteres.',
      400,
      'REMOVAL_REASON_TOO_LONG',
    );
  }

  const transaction = await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 2. Obtener y bloquear programación
    // ------------------------------------------------------

    const programacion = await ProgramacionRuta.findByPk(
      programmingId,
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
      ![
        'PROGRAMADA',
        'ASIGNADA',
      ].includes(
        programacion.estado_programacion,
      )
    ) {
      throw new AppError(
        'Ya no se puede retirar personal de esta programación.',
        409,
        'PROGRAMMING_TEAM_CANNOT_BE_UPDATED',
      );
    }

    // ------------------------------------------------------
    // 3. Obtener asignación + auditoria
    // ------------------------------------------------------
    const assignment = await ProgramacionPersonal.findOne({
      where: {
        id_programacion: programmingId,
        id_programacion_personal: assignmentId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!assignment) {
      throw new AppError(
        'La asignación de personal no fue encontrada.',
        404,
        'PERSONAL_ASSIGNMENT_NOT_FOUND',
      );
    }

    if (assignment.estado_asignacion === 'RETIRADO') {
      throw new AppError(
        'El personal ya fue retirado.',
        409,
        'PERSONAL_ALREADY_REMOVED',
      );
    }

    // ------------------------------------------------------
    // 4. Recuperar usuario del personal
    // ------------------------------------------------------

    /*
     * No exigimos que el perfil laboral esté activo
     * para poder retirar una asignación existente.
     *
     * El resolver comprobará si la cuenta del usuario
     * está activa antes de crear su notificación.
     */
    const personal =
      await PersonalOperativo.findByPk(
        assignment.id_personal,
        {
          attributes: [
            'id_personal',
            'id_usuario',
          ],

          paranoid: false,
          transaction,
        },
      );

    const recipientId =
      personal?.id_usuario == null
        ? null
        : String(personal.id_usuario);

    // ------------------------------------------------------
    // 5. Conservar estado anterior
    // ------------------------------------------------------

    const previousState = programacion.estado_programacion;

    const previousAssignmentData = {
      id_personal:
        assignment.id_personal,

      funcion:
        assignment.funcion,

      estado_asignacion:
        assignment.estado_asignacion,
    };

    // ------------------------------------------------------
    // CAPTURAR ESTADOS ANTERIORES PARA AUDITORÍA
    // ------------------------------------------------------

    const auditarAsignacion = prepararAuditoria(
      'ASIGNACION',
      'RETIRAR_PERSONAL',
      assignment,
    );

    const auditarProgramacion = prepararAuditoria(
      'PROGRAMACION',
      'CAMBIAR_ESTADO_POR_RETIRO_PERSONAL',
      programacion,
    );

    // ------------------------------------------------------
    // 6. Retirar personal
    // ------------------------------------------------------

    await assignment.update(
      {
        estado_asignacion:
          'RETIRADO',

        observacion:
          removalReason,
      },
      {
        transaction,
      },
    );

    const newState =
      await recalculateProgrammingState(
        programacion,
        transaction,
      );

    // ------------------------------------------------------
    // 7. Registrar historial
    // ------------------------------------------------------

    await registerHistory({
      id_programacion:
        programmingId,

      id_usuario:
        actorId,

      tipo_evento:
        'RETIRO_PERSONAL',

      estado_anterior:
        previousState,

      estado_nuevo:
        newState,

      datos_anteriores:
        previousAssignmentData,

      observacion:
        removalReason,

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Encolar aviso al usuario retirado
    // ------------------------------------------------------

    if (recipientId !== null) {
      const visibleReason =
        removalReason.length > 300
          ? `${removalReason.slice(0, 297)}...`
          : removalReason;

      /*
       * Una misma fila de asignación puede reutilizarse
       * después de una reasignación. Cada retiro efectivo
       * debe producir un evento distinto.
       */
      const removalEventId =
        randomUUID();

      await enqueueNotification({
        notificacion: {
          tipo_notificacion:
            'RETIRO_PERSONAL',

          titulo:
            'Asignación retirada',

          mensaje:
            `Se retiró tu asignación como ${assignment.funcion} ` +
            `de la programación de recolección ` +
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
            programmingId,

          datos: {
            id_programacion:
              programmingId,

            id_programacion_personal:
              assignment.id_programacion_personal,

            id_personal:
              assignment.id_personal,

            id_ruta:
              programacion.id_ruta,

            funcion:
              assignment.funcion,

            estado_asignacion:
              'RETIRADO',

            motivo_retiro:
              removalReason,

            fecha_programada:
              programacion.fecha_programada,

            hora_inicio_programada:
              programacion.hora_inicio_programada,

            hora_fin_programada:
              programacion.hora_fin_programada,
          },

          clave_evento:
            `RETIRO_PERSONAL:${assignmentId}:` +
            removalEventId,

          origen:
            'SISTEMA',
        },

        destino: {
          tipo_destino:
            'USUARIOS',

          destinatarios: [
            recipientId,
          ],
        },

        id_usuario_creacion:
          actorId,

        transaction,
      });
    }

    // ------------------------------------------------------
    // AUDITAR RETIRO DE LA ASIGNACIÓN
    // ------------------------------------------------------
    await auditarAsignacion(
      assignment,
      transaction,
      {
        motivo: removalReason,
      },
    );

    // ------------------------------------------------------
    // AUDITAR PROGRAMACIÓN SI CAMBIÓ SU ESTADO
    // ------------------------------------------------------
    if (previousState !== newState) {
      await auditarProgramacion(
        programacion,
        transaction,
        {
          motivo: removalReason,
        },
      );
    }

    // ------------------------------------------------------
    // 9. Confirmar retiro y aviso
    // ------------------------------------------------------

    await transaction.commit();

    // El worker despachará la notificación confirmada.
    return assignment;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = removeProgramacionPersonalService;

// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Modelos
// const {
//     ProgramacionRuta,
//     ProgramacionPersonal,
//     sequelize,
// } = db;

// // Utils
// const recalculateProgrammingState = require("../../utils/programacion-personal.utils");

// const {
//     validateId,
//     registerHistory,
// } = require('../../utils/programacion-service.utils');

// // ===============================================
// // SERVICE: Remover personal a la programacion
// // ===============================================
// const removeProgramacionPersonalService = async (
//     idProgramacion,
//     idAsignacion,
//     {
//         observacion = null,
//         id_usuario,
//         ip = null,
//         user_agent = null,
//     },
// ) => {
//     const programmingId = validateId(idProgramacion, 'identificador de la programación');
//     const assignmentId = validateId(idAsignacion, 'identificador de la asignación');

//     const transaction = await sequelize.transaction();

//     try {
//         const programacion = await ProgramacionRuta
//             .findByPk(
//                 programmingId,
//                 {
//                     transaction,
//                     lock: transaction.LOCK.UPDATE,
//                 },
//             );

//         if (!programacion) {
//             throw new AppError(
//                 'La programación no fue encontrada.',
//                 404,
//                 'PROGRAMMING_NOT_FOUND',
//             );
//         }

//         if (
//             ![
//                 'PROGRAMADA',
//                 'ASIGNADA',
//             ].includes(
//                 programacion.estado_programacion,
//             )
//         ) {
//             throw new AppError(
//                 'Ya no se puede retirar personal de esta programación.',
//                 409,
//                 'PROGRAMMING_TEAM_CANNOT_BE_UPDATED',
//             );
//         }

//         const assignment =
//             await ProgramacionPersonal
//                 .findOne({
//                     where: {
//                         id_programacion: programmingId,
//                         id_programacion_personal: assignmentId,
//                     },

//                     transaction,
//                 });

//         if (!assignment) {
//             throw new AppError(
//                 'La asignación de personal no fue encontrada.',
//                 404,
//                 'PERSONAL_ASSIGNMENT_NOT_FOUND',
//             );
//         }

//         if (assignment.estado_asignacion === 'RETIRADO') {
//             throw new AppError(
//                 'El personal ya fue retirado.',
//                 409,
//                 'PERSONAL_ALREADY_REMOVED',
//             );
//         }

//         const previousState = programacion.estado_programacion;

//         await assignment.update(
//             {
//                 estado_asignacion: 'RETIRADO',
//                 observacion: observacion?.trim() ||
//                     'Personal retirado de la programación.',
//             },
//             {
//                 transaction,
//             },
//         );

//         const newState =
//             await recalculateProgrammingState(
//                 programacion,
//                 transaction,
//             );

//         await registerHistory({
//             id_programacion: programmingId,
//             id_usuario,
//             tipo_evento: 'RETIRO_PERSONAL',
//             estado_anterior: previousState,
//             estado_nuevo: newState,
//             datos_anteriores: {
//                 id_personal: assignment.id_personal,
//                 funcion: assignment.funcion,
//             },
//             observacion: assignment.observacion,
//             ip,
//             user_agent,
//             transaction,
//         });

//         await transaction.commit();

//         return assignment;
//     } catch (error) {
//         if (!transaction.finished) {
//             await transaction.rollback();
//         }

//         throw error;
//     }
// };

// module.exports = removeProgramacionPersonalService;