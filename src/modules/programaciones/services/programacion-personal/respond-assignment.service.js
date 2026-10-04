const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

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

// ===============================================
// SERVICE: RESPONDER ASIGNACIÓN
// ===============================================
const respondAssignmentService = async ({
  id_programacion_personal,
  id_usuario,
  estado_asignacion,
  observacion = null,
  ip = null,
  user_agent = null,
  origen = 'MOVIL',
}) => {
  // 1. VALIDAR IDENTIFICADORES
  const assignmentId = validateId(
    id_programacion_personal,
    'identificador de la asignación',
  );

  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  // 2. VALIDAR RESPUESTA
  const responseState = String(
    estado_asignacion ?? '',
  )
    .trim()
    .toUpperCase();

  if (!['ACEPTADO', 'RECHAZADO'].includes(responseState)) {
    throw new AppError(
      'La respuesta debe ser ACEPTADO o RECHAZADO.',
      400,
      'INVALID_ASSIGNMENT_RESPONSE',
    );
  }

  // 3. VALIDAR OBSERVACIÓN
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

  const transaction = await sequelize.transaction();

  try {
    // 4. OBTENER PERFIL DEL USUARIO AUTENTICADO
    const personal = await PersonalOperativo.findOne({
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

    // 5. LOCALIZAR LA ASIGNACIÓN DEL USUARIO
    // Esta consulta permite conocer la programación
    // antes de bloquearla.
    const assignmentReference =
      await ProgramacionPersonal.findOne({
        where: {
          id_programacion_personal: assignmentId,
          id_personal: personal.id_personal,
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

    // 6. BLOQUEAR LA PROGRAMACIÓN
    // Conservamos el orden: programación → asignación.
    const programacion = await ProgramacionRuta.findByPk(
      assignmentReference.id_programacion,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!programacion) {
      throw new AppError(
        'La programación no fue encontrada.',
        404,
        'PROGRAMMING_NOT_FOUND',
      );
    }

    // 7. BLOQUEAR Y REVALIDAR LA ASIGNACIÓN
    const assignment = await ProgramacionPersonal.findOne({
      where: {
        id_programacion_personal: assignmentId,
        id_programacion: programacion.id_programacion,
        id_personal: personal.id_personal,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!assignment) {
      throw new AppError(
        'La asignación no existe o no pertenece al usuario autenticado.',
        404,
        'ASSIGNMENT_NOT_FOUND',
      );
    }

    // 8. VALIDAR ESTADO DE LA PROGRAMACIÓN
    if (
      !['ASIGNADA', 'ACEPTADA'].includes(
        programacion.estado_programacion,
      )
    ) {
      throw new AppError(
        'La programación no admite respuestas en su estado actual.',
        409,
        'PROGRAMMING_DOES_NOT_ACCEPT_RESPONSES',
      );
    }

    // 9. VALIDAR QUE LA ASIGNACIÓN ESTÉ PENDIENTE
    if (assignment.estado_asignacion !== 'ASIGNADO') {
      throw new AppError(
        'La asignación ya fue respondida o no está pendiente.',
        409,
        'ASSIGNMENT_NOT_PENDING',
      );
    }

    // Guardar el estado ANTES de modificar la instancia.
    const previousProgrammingState =
      programacion.estado_programacion;

    const accepted = responseState === 'ACEPTADO';

    // 10. ACTUALIZAR ASIGNACIÓN
    await assignment.update(
      {
        estado_asignacion: responseState,
        fecha_respuesta: new Date(),
        observacion: normalizedObservation,
      },
      { transaction },
    );

    // 11. ACTUALIZAR PROGRAMACIÓN SI ES CONDUCTOR PRINCIPAL
    let newProgrammingState = previousProgrammingState;

    if (
      assignment.funcion === 'CONDUCTOR' &&
      assignment.es_principal
    ) {
      newProgrammingState = accepted
        ? 'ACEPTADA'
        : 'PROGRAMADA';

      await programacion.update(
        {
          estado_programacion: newProgrammingState,
        },
        { transaction },
      );
    }

    // 12. REGISTRAR HISTORIAL
    await registerHistory({
      id_programacion: programacion.id_programacion,
      id_usuario: userId,
      tipo_evento: accepted
        ? 'ACEPTACION'
        : 'RECHAZO',
      estado_anterior: previousProgrammingState,
      estado_nuevo: newProgrammingState,
      datos_nuevos: {
        id_programacion_personal: assignmentId,
        id_personal: personal.id_personal,
        funcion: assignment.funcion,
        respuesta: responseState,
      },
      observacion: normalizedObservation,
      origen,
      ip,
      user_agent,
      transaction,
    });

    await transaction.commit();

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
// // SERVICE: Responder asignacion
// // ===============================================
// const respondAssignmentService = async ({
//   id_programacion,
//   id_usuario,
//   action,
//   observacion = null,
//   ip = null,
//   user_agent = null,
// }) => {
//   const programmingId = validateId(id_programacion, 'identificador de la programación',);

//   if (
//     ![
//       'ACEPTAR',
//       'RECHAZAR',
//     ].includes(action)
//   ) {
//     throw new AppError(
//       'La acción de respuesta no es válida.',
//       400,
//       'INVALID_ASSIGNMENT_RESPONSE',
//     );
//   }

//   const transaction =
//     await sequelize.transaction();

//   try {
//     const personal =
//       await PersonalOperativo
//         .findOne({
//           where: {
//             id_usuario,
//             estado: true,
//           },

//           transaction,
//         });

//     if (!personal) {
//       throw new AppError(
//         'El usuario no tiene un perfil laboral activo.',
//         403,
//         'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
//       );
//     }

//     const programacion = await ProgramacionRuta
//       .findByPk(
//         programmingId,
//         {
//           transaction,
//           lock:
//             transaction.LOCK
//               .UPDATE,
//         },
//       );

//     if (!programacion) {
//       throw new AppError(
//         'La programación no fue encontrada.',
//         404,
//         'PROGRAMMING_NOT_FOUND',
//       );
//     }

//     if (
//       ![
//         'ASIGNADA',
//         'ACEPTADA',
//       ].includes(
//         programacion
//           .estado_programacion,
//       )
//     ) {
//       throw new AppError(
//         'La programación no admite respuestas en su estado actual.',
//         409,
//         'PROGRAMMING_DOES_NOT_ACCEPT_RESPONSES',
//       );
//     }

//     const assignment = await ProgramacionPersonal
//       .findOne({
//         where: {
//           id_programacion: programmingId,
//           id_personal: personal.id_personal,

//           estado_asignacion:
//             'ASIGNADO',
//         },

//         transaction,
//         lock:
//           transaction.LOCK
//             .UPDATE,
//       });

//     if (!assignment) {
//       throw new AppError(
//         'No existe una asignación pendiente para el usuario.',
//         404,
//         'PENDING_ASSIGNMENT_NOT_FOUND',
//       );
//     }

//     const accepted =
//       action === 'ACEPTAR';

//     await assignment.update(
//       {
//         estado_asignacion:
//           accepted
//             ? 'ACEPTADO'
//             : 'RECHAZADO',

//         fecha_respuesta:
//           new Date(),

//         observacion:
//           observacion?.trim() ||
//           null,
//       },
//       {
//         transaction,
//       },
//     );

//     let newProgrammingState =
//       programacion
//         .estado_programacion;

//     if (
//       assignment.funcion ===
//       'CONDUCTOR' &&
//       assignment.es_principal
//     ) {
//       newProgrammingState =
//         accepted
//           ? 'ACEPTADA'
//           : 'PROGRAMADA';

//       await programacion.update(
//         {
//           estado_programacion:
//             newProgrammingState,
//         },
//         {
//           transaction,
//         },
//       );
//     }

//     await registerHistory({
//       id_programacion: programmingId,
//       id_usuario,
//       tipo_evento: accepted
//         ? 'ACEPTACION'
//         : 'RECHAZO',

//       estado_anterior: programacion.estado_programacion,

//       estado_nuevo: newProgrammingState,

//       datos_nuevos: {
//         id_personal: personal.id_personal,
//         funcion: assignment.funcion,
//         respuesta: accepted
//           ? 'ACEPTADO'
//           : 'RECHAZADO',
//       },

//       observacion,
//       origen: 'MOVIL',
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