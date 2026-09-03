const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  Usuario,
  Persona,
} = db;

// Utils
const { validateId } = require('../../utils/programacion-service.utils');

// ===============================================
// SERVICE: Obtener programacion personal
// ===============================================
const getProgramacionPersonalService = async (idProgramacion) => {
  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const programacion =
    await ProgramacionRuta
      .findByPk(id);

  if (!programacion) {
    throw new AppError(
      'La programación no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  return ProgramacionPersonal.findAll({
    where: {
      id_programacion: id,
    },

    include: [
      {
        model:
          PersonalOperativo,

        as: 'personal',

        include: [
          {
            model: Usuario,
            as: 'usuario',

            attributes: [
              'id_usuario',
              'username',
              'email_acceso',
            ],

            include: [
              {
                model:
                  Persona,

                as: 'persona',

                attributes: [
                  'nombres',
                  'apellidos',
                  'numero_documento',
                  'celular',
                ],
              },
            ],
          },
          {
            association:
              'conductor',

            required: false,
          },
        ],
      },
    ],

    order: [
      ['funcion', 'ASC'],
      [
        'es_principal',
        'DESC',
      ],
    ],
  });
};

module.exports = getProgramacionPersonalService;