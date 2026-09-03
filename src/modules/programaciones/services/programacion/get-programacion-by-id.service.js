const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils 
const {  validateId} = require("../../utils/programacion-service.utils");

// Modelos
const {
  ProgramacionRuta,
  ProgramacionHistorial,
} = db;

// ===============================================
// SERVICE: Obtener programacion by id
// ===============================================
const getProgramacionByIdService = async (idProgramacion) => {
  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const programacion =
    await ProgramacionRuta
      .findByPk(id, {
        include: [
          {
            association: 'ruta',

            include: [
              {
                association:
                  'zona',
              },
            ],
          },
          {
            association:
              'version_ruta',

            include: [
              {
                association:
                  'puntos',

                where: {
                  estado: true,
                },

                required: false,
              },
            ],
          },
          {
            association:
              'vehiculo',
          },
          {
            association:
              'creador',

            attributes: [
              'id_usuario',
              'username',
              'email_acceso',
            ],

            include: [
              {
                association:
                  'persona',

                attributes: [
                  'id_persona',
                  'nombres',
                  'apellidos',
                ],
              },
            ],
          },
          {
            association:
              'personal_asignado',

            include: [
              {
                association:
                  'personal',

                include: [
                  {
                    association:
                      'usuario',

                    attributes: [
                      'id_usuario',
                      'username',
                      'email_acceso',
                    ],

                    include: [
                      {
                        association:
                          'persona',

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
          },
          {
            association:
              'historial',

            include: [
              {
                association:
                  'actor',

                attributes: [
                  'id_usuario',
                  'username',
                ],

                required: false,
              },
            ],
          },
        ],

        order: [
          [
            {
              model:
                ProgramacionHistorial,

              as: 'historial',
            },
            'created_at',
            'ASC',
          ],
        ],
      });

  if (!programacion) {
    throw new AppError(
      'La programación no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  return programacion;
};

module.exports = getProgramacionByIdService;