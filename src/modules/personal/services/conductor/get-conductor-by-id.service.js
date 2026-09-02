const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  PersonalOperativo,
  ConductorPerfil,
  Usuario,
  Persona,
} = db;

// Utils
const { validateId } = require("../../utils/conductor/conductor.utils");

// ===============================================
// SERVICE: Obtener perfil de conductor
// ===============================================
const getConductorByIdService = async (idPersonal) => {
  const id = validateId(idPersonal);

  const conductor = await ConductorPerfil
    .findOne({
      where: {
        id_personal: id,
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
                'estado',
              ],

              include: [
                {
                  model:
                    Persona,

                  as: 'persona',

                  attributes: [
                    'id_persona',
                    'nombres',
                    'apellidos',
                    'numero_documento',
                    'celular',
                    'foto_url',
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

  if (!conductor) {
    throw new AppError(
      'El perfil de conductor no fue encontrado.',
      404,
      'DRIVER_PROFILE_NOT_FOUND',
    );
  }

  return conductor;
};


module.exports = getConductorByIdService;
