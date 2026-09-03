const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const getProgramacionByIdService = require("./get-programacion-by-id.service");

// Utils 
const {
  validateId,
  registerHistory,
} = require("../../utils/programacion-service.utils");

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  sequelize,
} = db;

// ===============================================
// SERVICE: Cancelar programacion
// ===============================================
const cancelProgramacionService = async (
  idProgramacion,
  {
    motivo_cancelacion,
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const reason =
    String(
      motivo_cancelacion ||
      '',
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
    const programacion =
      await ProgramacionRuta
        .findByPk(id, {
          transaction,
          lock:
            transaction.LOCK
              .UPDATE,
        });

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
        programacion
          .estado_programacion,
      )
    ) {
      throw new AppError(
        'La programación no puede cancelarse.',
        409,
        'PROGRAMMING_CANNOT_BE_CANCELLED',
      );
    }

    const previousState =
      programacion
        .estado_programacion;

    await programacion.update(
      {
        estado_programacion:
          'CANCELADA',

        motivo_cancelacion:
          reason,

        fecha_cancelacion:
          new Date(),
      },
      {
        transaction,
      },
    );

    await ProgramacionPersonal
      .update(
        {
          estado_asignacion:
            'RETIRADO',

          observacion:
            'Asignación retirada por cancelación de la programación.',
        },
        {
          where: {
            id_programacion:
              id,

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

    await registerHistory({
      id_programacion: id,
      id_usuario,
      tipo_evento:
        'CANCELACION',

      estado_anterior:
        previousState,

      estado_nuevo:
        'CANCELADA',

      observacion:
        reason,

      ip,
      user_agent,
      transaction,
    });

    await transaction.commit();

    return getProgramacionByIdService(id);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = cancelProgramacionService;