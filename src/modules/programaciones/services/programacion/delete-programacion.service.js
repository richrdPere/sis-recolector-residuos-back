const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils 
const { validateId } = require("../../utils/programacion-service.utils");

// Modelos
const { ProgramacionRuta } = db;

// ===============================================
// SERVICE: Eliminar programacion
// ===============================================
const deleteProgramacionService = async (idProgramacion) => {
  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const programacion = await ProgramacionRuta
    .findByPk(id, {
      include: [
        {
          association:
            'personal_asignado',

          where: {
            estado_asignacion: {
              [Op.notIn]: [
                'RETIRADO',
                'RECHAZADO',
              ],
            },
          },

          required: false,
        },
      ],
    });

  if (!programacion) {
    throw new AppError(
      'La programación no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  if (
    programacion
      .estado_programacion !==
    'PROGRAMADA' ||
    programacion
      .personal_asignado
      ?.length
  ) {
    throw new AppError(
      'Solo se puede eliminar una programación sin personal y en estado PROGRAMADA.',
      409,
      'PROGRAMMING_CANNOT_BE_DELETED',
    );
  }

  await programacion.destroy();

  return {
    id_programacion: id,
    deleted: true,
  };
};

module.exports = deleteProgramacionService;