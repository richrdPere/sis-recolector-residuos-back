const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  sequelize,
} = db;

// Utils
const recalculateProgrammingState = require("../../utils/programacion-personal.utils");

const {
  validateId,
  getPersonalForFunction,
  assertPersonalAvailable,
  registerHistory,
} = require('../../utils/programacion-service.utils');


// ===============================================
// SERVICE: Agregar personal a la programacion
// ===============================================
const addProgramacionPersonalService = async (idProgramacion,
  {
    id_personal,
    funcion,
    es_principal = false,
    observacion = null,
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  const programmingId =
    validateId(
      idProgramacion,
      'identificador de la programación',
    );

  const personalId =
    validateId(
      id_personal,
      'identificador del personal',
    );

  const transaction =
    await sequelize.transaction();

  try {
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
        'PROGRAMADA',
        'ASIGNADA',
      ].includes(
        programacion
          .estado_programacion,
      )
    ) {
      throw new AppError(
        'Ya no se puede modificar el equipo de esta programación.',
        409,
        'PROGRAMMING_TEAM_CANNOT_BE_UPDATED',
      );
    }

    await getPersonalForFunction({
      id_personal:
        personalId,

      funcion,
      transaction,
    });

    await assertPersonalAvailable({
      id_personal:
        personalId,

      fecha_programada:
        programacion
          .fecha_programada,

      hora_inicio_programada:
        programacion
          .hora_inicio_programada,

      hora_fin_programada:
        programacion
          .hora_fin_programada,

      excludeProgramacionId:
        programmingId,

      transaction,
    });

    if (
      funcion ===
      'CONDUCTOR'
    ) {
      const existingDriver =
        await ProgramacionPersonal
          .findOne({
            where: {
              id_programacion:
                programmingId,

              funcion:
                'CONDUCTOR',

              estado_asignacion: {
                [Op.notIn]: [
                  'RECHAZADO',
                  'RETIRADO',
                ],
              },
            },

            transaction,
          });

      if (
        existingDriver &&
        Number(
          existingDriver
            .id_personal,
        ) !== personalId
      ) {
        throw new AppError(
          'La programación ya tiene un conductor asignado.',
          409,
          'PROGRAMMING_ALREADY_HAS_DRIVER',
        );
      }

      es_principal = true;
    } else {
      es_principal = false;
    }

    let assignment =
      await ProgramacionPersonal
        .findOne({
          where: {
            id_programacion:
              programmingId,

            id_personal:
              personalId,
          },

          paranoid: false,
          transaction,
        });

    if (assignment) {
      if (
        assignment.deleted_at &&
        typeof assignment
          .restore ===
        'function'
      ) {
        await assignment.restore({
          transaction,
        });
      }

      if (
        ![
          'RETIRADO',
          'RECHAZADO',
        ].includes(
          assignment
            .estado_asignacion,
        )
      ) {
        throw new AppError(
          'El personal ya está asignado a esta programación.',
          409,
          'PERSONAL_ALREADY_ASSIGNED',
        );
      }

      await assignment.update(
        {
          funcion,
          es_principal,

          estado_asignacion:
            'ASIGNADO',

          fecha_respuesta:
            null,

          observacion:
            observacion?.trim() ||
            null,
        },
        {
          transaction,
        },
      );
    } else {
      assignment =
        await ProgramacionPersonal
          .create(
            {
              id_programacion:
                programmingId,

              id_personal:
                personalId,

              funcion,
              es_principal,

              estado_asignacion:
                'ASIGNADO',

              observacion:
                observacion?.trim() ||
                null,
            },
            {
              transaction,
            },
          );
    }

    const previousState = programacion.estado_programacion;

    const newState = await recalculateProgrammingState(
      programacion,
      transaction,
    );

    await registerHistory({
      id_programacion: programmingId,
      id_usuario,
      tipo_evento: 'ASIGNACION_PERSONAL',
      estado_anterior: previousState,
      estado_nuevo: newState,
      datos_nuevos: {
        id_personal: personalId,
        funcion,
        es_principal,
      },

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


module.exports = addProgramacionPersonalService;