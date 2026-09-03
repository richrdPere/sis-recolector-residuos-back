
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
// SERVICE: Responder asignacion
// ===============================================
const respondAssignmentService = async ({
  id_programacion,
  id_usuario,
  action,
  observacion = null,
  ip = null,
  user_agent = null,
}) => {
  const programmingId =
    validateId(
      id_programacion,
      'identificador de la programación',
    );

  if (
    ![
      'ACEPTAR',
      'RECHAZAR',
    ].includes(action)
  ) {
    throw new AppError(
      'La acción de respuesta no es válida.',
      400,
      'INVALID_ASSIGNMENT_RESPONSE',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    const personal =
      await PersonalOperativo
        .findOne({
          where: {
            id_usuario,
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

    const programacion =
      await ProgramacionRuta
        .findByPk(
          programmingId,
          {
            transaction,
            lock:
              transaction.LOCK
                .UPDATE,
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
        'ASIGNADA',
        'ACEPTADA',
      ].includes(
        programacion
          .estado_programacion,
      )
    ) {
      throw new AppError(
        'La programación no admite respuestas en su estado actual.',
        409,
        'PROGRAMMING_DOES_NOT_ACCEPT_RESPONSES',
      );
    }

    const assignment =
      await ProgramacionPersonal
        .findOne({
          where: {
            id_programacion:
              programmingId,

            id_personal:
              personal
                .id_personal,

            estado_asignacion:
              'ASIGNADO',
          },

          transaction,
          lock:
            transaction.LOCK
              .UPDATE,
        });

    if (!assignment) {
      throw new AppError(
        'No existe una asignación pendiente para el usuario.',
        404,
        'PENDING_ASSIGNMENT_NOT_FOUND',
      );
    }

    const accepted =
      action === 'ACEPTAR';

    await assignment.update(
      {
        estado_asignacion:
          accepted
            ? 'ACEPTADO'
            : 'RECHAZADO',

        fecha_respuesta:
          new Date(),

        observacion:
          observacion?.trim() ||
          null,
      },
      {
        transaction,
      },
    );

    let newProgrammingState =
      programacion
        .estado_programacion;

    if (
      assignment.funcion ===
      'CONDUCTOR' &&
      assignment.es_principal
    ) {
      newProgrammingState =
        accepted
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

    await registerHistory({
      id_programacion:
        programmingId,

      id_usuario,

      tipo_evento:
        accepted
          ? 'ACEPTACION'
          : 'RECHAZO',

      estado_anterior:
        programacion
          .estado_programacion,

      estado_nuevo:
        newProgrammingState,

      datos_nuevos: {
        id_personal:
          personal.id_personal,

        funcion:
          assignment.funcion,

        respuesta:
          accepted
            ? 'ACEPTADO'
            : 'RECHAZADO',
      },

      observacion,
      origen: 'MOVIL',
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