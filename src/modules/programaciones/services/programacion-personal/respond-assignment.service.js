const { randomUUID } = require('node:crypto');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../../jobs/notification-worker');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  sequelize,
} = db;

// Utils
const {
  validateId,
  registerHistory,
} = require('../../utils/programacion-service.utils');

// ==========================================================
// SERVICE: RESPONDER ASIGNACIÓN
// ==========================================================

const respondAssignmentService = async ({
  id_programacion_personal,
  id_usuario,
  estado_asignacion,
  observacion = null,
  ip = null,
  user_agent = null,
  origen = 'MOVIL',
}) => {
  // --------------------------------------------------------
  // 1. Validar identificadores
  // --------------------------------------------------------

  const assignmentId = validateId(
    id_programacion_personal,
    'identificador de la asignación',
  );

  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  // --------------------------------------------------------
  // 2. Validar respuesta
  // --------------------------------------------------------

  const responseState = String(
    estado_asignacion ?? '',
  )
    .trim()
    .toUpperCase();

  if (
    ![
      'ACEPTADO',
      'RECHAZADO',
    ].includes(responseState)
  ) {
    throw new AppError(
      'La respuesta debe ser ACEPTADO o RECHAZADO.',
      400,
      'INVALID_ASSIGNMENT_RESPONSE',
    );
  }

  // --------------------------------------------------------
  // 3. Validar observación
  // --------------------------------------------------------

  if (
    observacion !== null &&
    typeof observacion !== 'string'
  ) {
    throw new AppError(
      'La observación debe ser un texto.',
      400,
      'INVALID_ASSIGNMENT_OBSERVATION',
    );
  }

  const normalizedObservation =
    observacion?.trim() || null;

  const transaction =
    await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 4. Obtener perfil del usuario autenticado
    // ------------------------------------------------------

    const personal =
      await PersonalOperativo.findOne({
        where: {
          id_usuario: userId,
          estado: true,
        },

        transaction,
      });

    if (!personal) {
      throw new AppError(
        'El usuario no tiene un perfil laboral activo.',
        403,
        'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
      );
    }

    // ------------------------------------------------------
    // 5. Localizar asignación del usuario
    // ------------------------------------------------------

    const assignmentReference =
      await ProgramacionPersonal.findOne({
        where: {
          id_programacion_personal:
            assignmentId,

          id_personal:
            personal.id_personal,
        },

        attributes: [
          'id_programacion_personal',
          'id_programacion',
        ],

        transaction,
      });

    if (!assignmentReference) {
      throw new AppError(
        'La asignación no existe o no pertenece al usuario autenticado.',
        404,
        'ASSIGNMENT_NOT_FOUND',
      );
    }

    // ------------------------------------------------------
    // 6. Bloquear programación
    // Orden: programación → asignación
    // ------------------------------------------------------

    const programacion =
      await ProgramacionRuta.findByPk(
        assignmentReference.id_programacion,
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

    // ------------------------------------------------------
    // 7. Bloquear y revalidar asignación
    // ------------------------------------------------------

    const assignment =
      await ProgramacionPersonal.findOne({
        where: {
          id_programacion_personal:
            assignmentId,

          id_programacion:
            programacion.id_programacion,

          id_personal:
            personal.id_personal,
        },

        transaction,

        lock:
          transaction.LOCK.UPDATE,
      });

    if (!assignment) {
      throw new AppError(
        'La asignación no existe o no pertenece al usuario autenticado.',
        404,
        'ASSIGNMENT_NOT_FOUND',
      );
    }

    // ------------------------------------------------------
    // 8. Validar estado de programación
    // ------------------------------------------------------

    if (
      ![
        'ASIGNADA',
        'ACEPTADA',
      ].includes(
        programacion.estado_programacion,
      )
    ) {
      throw new AppError(
        'La programación no admite respuestas en su estado actual.',
        409,
        'PROGRAMMING_DOES_NOT_ACCEPT_RESPONSES',
      );
    }

    // ------------------------------------------------------
    // 9. Validar que la asignación esté pendiente
    // ------------------------------------------------------

    if (
      assignment.estado_asignacion !==
      'ASIGNADO'
    ) {
      throw new AppError(
        'La asignación ya fue respondida o no está pendiente.',
        409,
        'ASSIGNMENT_NOT_PENDING',
      );
    }

    const previousProgrammingState =
      programacion.estado_programacion;

    const accepted =
      responseState === 'ACEPTADO';

    const responseDate =
      new Date();

    // ------------------------------------------------------
    // 10. Actualizar asignación
    // ------------------------------------------------------

    await assignment.update(
      {
        estado_asignacion:
          responseState,

        fecha_respuesta:
          responseDate,

        observacion:
          normalizedObservation,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 11. Actualizar programación si es conductor principal
    // ------------------------------------------------------

    let newProgrammingState =
      previousProgrammingState;

    if (
      assignment.funcion === 'CONDUCTOR' &&
      assignment.es_principal
    ) {
      newProgrammingState = accepted
        ? 'ACEPTADA'
        : 'PROGRAMADA';

      await programacion.update(
        {
          estado_programacion:
            newProgrammingState,
        },
        {
          transaction,
        },
      );
    }

    // ------------------------------------------------------
    // 12. Registrar historial
    // ------------------------------------------------------

    await registerHistory({
      id_programacion:
        programacion.id_programacion,

      id_usuario:
        userId,

      tipo_evento:
        accepted
          ? 'ACEPTACION'
          : 'RECHAZO',

      estado_anterior:
        previousProgrammingState,

      estado_nuevo:
        newProgrammingState,

      datos_nuevos: {
        id_programacion_personal:
          assignmentId,

        id_personal:
          personal.id_personal,

        funcion:
          assignment.funcion,

        respuesta:
          responseState,
      },

      observacion:
        normalizedObservation,

      origen,
      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 13. Notificar al creador de la programación
    // ------------------------------------------------------

    const creatorId =
      programacion.id_usuario_creacion;

    if (
      creatorId != null &&
      String(creatorId) !== String(userId)
    ) {
      const responseEventId =
        randomUUID();

      let message =
        `El personal asignado como ${assignment.funcion} ` +
        `${accepted ? 'aceptó' : 'rechazó'} su asignación ` +
        `a la programación de recolección ` +
        `del ${programacion.fecha_programada}, ` +
        `de ${programacion.hora_inicio_programada} ` +
        `a ${programacion.hora_fin_programada}.`;

      if (normalizedObservation) {
        const visibleObservation =
          normalizedObservation.length > 300
            ? `${normalizedObservation.slice(0, 297)}...`
            : normalizedObservation;

        message +=
          ` Observación: ${visibleObservation}`;
      }

      await enqueueNotification({
        notificacion: {
          tipo_notificacion:
            accepted
              ? 'ASIGNACION_ACEPTADA'
              : 'ASIGNACION_RECHAZADA',

          titulo:
            accepted
              ? 'Asignación aceptada'
              : 'Asignación rechazada',

          mensaje:
            message,

          prioridad:
            accepted
              ? 'NORMAL'
              : 'ALTA',

          enviar_interna: true,
          enviar_push: true,

          tipo_entidad:
            'PROGRAMACION',

          id_entidad:
            programacion.id_programacion,

          datos: {
            id_programacion:
              programacion.id_programacion,

            id_programacion_personal:
              assignmentId,

            id_personal:
              personal.id_personal,

            id_usuario_respuesta:
              userId,

            funcion:
              assignment.funcion,

            es_principal:
              assignment.es_principal,

            respuesta:
              responseState,

            fecha_respuesta:
              responseDate.toISOString(),

            observacion:
              normalizedObservation,

            estado_programacion:
              newProgrammingState,
          },

          /*
           * Permite respuestas posteriores si la misma
           * asignación se retira y vuelve a asignarse.
           */
          clave_evento:
            `RESPUESTA_ASIGNACION:${assignmentId}:` +
            responseEventId,

          // Aviso generado automáticamente por el backend.
          origen:
            'SISTEMA',
        },

        destino: {
          tipo_destino:
            'USUARIOS',

          destinatarios: [
            String(creatorId),
          ],
        },

        // El usuario que respondió origina este evento.
        id_usuario_creacion:
          userId,

        transaction,
      });
    }

    // ------------------------------------------------------
    // 14. Confirmar respuesta y aviso
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

module.exports = respondAssignmentService;

// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Modelos
// const {
//   ProgramacionRuta,
//   ProgramacionPersonal,
//   PersonalOperativo,
//   sequelize,
// } = db;

// // Utils
// const {
//   validateId,
//   registerHistory,
// } = require('../../utils/programacion-service.utils');

// // ===============================================
// // SERVICE: RESPONDER ASIGNACIÓN
// // ===============================================
// const respondAssignmentService = async ({
//   id_programacion_personal,
//   id_usuario,
//   estado_asignacion,
//   observacion = null,
//   ip = null,
//   user_agent = null,
//   origen = 'MOVIL',
// }) => {
//   // 1. VALIDAR IDENTIFICADORES
//   const assignmentId = validateId(
//     id_programacion_personal,
//     'identificador de la asignación',
//   );

//   const userId = validateId(
//     id_usuario,
//     'identificador del usuario',
//   );

//   // 2. VALIDAR RESPUESTA
//   const responseState = String(
//     estado_asignacion ?? '',
//   )
//     .trim()
//     .toUpperCase();

//   if (!['ACEPTADO', 'RECHAZADO'].includes(responseState)) {
//     throw new AppError(
//       'La respuesta debe ser ACEPTADO o RECHAZADO.',
//       400,
//       'INVALID_ASSIGNMENT_RESPONSE',
//     );
//   }

//   // 3. VALIDAR OBSERVACIÓN
//   if (
//     observacion !== null &&
//     typeof observacion !== 'string'
//   ) {
//     throw new AppError(
//       'La observación debe ser un texto.',
//       400,
//       'INVALID_ASSIGNMENT_OBSERVATION',
//     );
//   }

//   const normalizedObservation = observacion?.trim() || null;

//   const transaction = await sequelize.transaction();

//   try {
//     // 4. OBTENER PERFIL DEL USUARIO AUTENTICADO
//     const personal = await PersonalOperativo.findOne({
//       where: {
//         id_usuario: userId,
//         estado: true,
//       },
//       transaction,
//     });

//     if (!personal) {
//       throw new AppError(
//         'El usuario no tiene un perfil laboral activo.',
//         403,
//         'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
//       );
//     }

//     // 5. LOCALIZAR LA ASIGNACIÓN DEL USUARIO
//     // Esta consulta permite conocer la programación
//     // antes de bloquearla.
//     const assignmentReference =
//       await ProgramacionPersonal.findOne({
//         where: {
//           id_programacion_personal: assignmentId,
//           id_personal: personal.id_personal,
//         },
//         attributes: [
//           'id_programacion_personal',
//           'id_programacion',
//         ],
//         transaction,
//       });

//     if (!assignmentReference) {
//       throw new AppError(
//         'La asignación no existe o no pertenece al usuario autenticado.',
//         404,
//         'ASSIGNMENT_NOT_FOUND',
//       );
//     }

//     // 6. BLOQUEAR LA PROGRAMACIÓN
//     // Conservamos el orden: programación → asignación.
//     const programacion = await ProgramacionRuta.findByPk(
//       assignmentReference.id_programacion,
//       {
//         transaction,
//         lock: transaction.LOCK.UPDATE,
//       },
//     );

//     if (!programacion) {
//       throw new AppError(
//         'La programación no fue encontrada.',
//         404,
//         'PROGRAMMING_NOT_FOUND',
//       );
//     }

//     // 7. BLOQUEAR Y REVALIDAR LA ASIGNACIÓN
//     const assignment = await ProgramacionPersonal.findOne({
//       where: {
//         id_programacion_personal: assignmentId,
//         id_programacion: programacion.id_programacion,
//         id_personal: personal.id_personal,
//       },
//       transaction,
//       lock: transaction.LOCK.UPDATE,
//     });

//     if (!assignment) {
//       throw new AppError(
//         'La asignación no existe o no pertenece al usuario autenticado.',
//         404,
//         'ASSIGNMENT_NOT_FOUND',
//       );
//     }

//     // 8. VALIDAR ESTADO DE LA PROGRAMACIÓN
//     if (
//       !['ASIGNADA', 'ACEPTADA'].includes(
//         programacion.estado_programacion,
//       )
//     ) {
//       throw new AppError(
//         'La programación no admite respuestas en su estado actual.',
//         409,
//         'PROGRAMMING_DOES_NOT_ACCEPT_RESPONSES',
//       );
//     }

//     // 9. VALIDAR QUE LA ASIGNACIÓN ESTÉ PENDIENTE
//     if (assignment.estado_asignacion !== 'ASIGNADO') {
//       throw new AppError(
//         'La asignación ya fue respondida o no está pendiente.',
//         409,
//         'ASSIGNMENT_NOT_PENDING',
//       );
//     }

//     // Guardar el estado ANTES de modificar la instancia.
//     const previousProgrammingState =
//       programacion.estado_programacion;

//     const accepted = responseState === 'ACEPTADO';

//     // 10. ACTUALIZAR ASIGNACIÓN
//     await assignment.update(
//       {
//         estado_asignacion: responseState,
//         fecha_respuesta: new Date(),
//         observacion: normalizedObservation,
//       },
//       { transaction },
//     );

//     // 11. ACTUALIZAR PROGRAMACIÓN SI ES CONDUCTOR PRINCIPAL
//     let newProgrammingState = previousProgrammingState;

//     if (
//       assignment.funcion === 'CONDUCTOR' &&
//       assignment.es_principal
//     ) {
//       newProgrammingState = accepted
//         ? 'ACEPTADA'
//         : 'PROGRAMADA';

//       await programacion.update(
//         {
//           estado_programacion: newProgrammingState,
//         },
//         { transaction },
//       );
//     }

//     // 12. REGISTRAR HISTORIAL
//     await registerHistory({
//       id_programacion: programacion.id_programacion,
//       id_usuario: userId,
//       tipo_evento: accepted
//         ? 'ACEPTACION'
//         : 'RECHAZO',
//       estado_anterior: previousProgrammingState,
//       estado_nuevo: newProgrammingState,
//       datos_nuevos: {
//         id_programacion_personal: assignmentId,
//         id_personal: personal.id_personal,
//         funcion: assignment.funcion,
//         respuesta: responseState,
//       },
//       observacion: normalizedObservation,
//       origen,
//       ip,
//       user_agent,
//       transaction,
//     });

//     await transaction.commit();

//     return assignment;
//   } catch (error) {
//     if (!transaction.finished) {
//       await transaction.rollback();
//     }

//     throw error;
//   }
// };

// module.exports = respondAssignmentService;

