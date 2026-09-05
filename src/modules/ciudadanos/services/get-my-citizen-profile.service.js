// services/get-my-citizen-profile.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/ciudadano.validation');

// Modelos
const {
  Ciudadano,
} = db;

// ===============================================
// SERVICE: Obtener el perfil del ciudadano
// ===============================================
const getMyCitizenProfileService = async (idUsuario) => {
  const userId =
    validateId(
      idUsuario,
      'identificador del usuario',
    );

  const ciudadano =
    await Ciudadano.findOne({
      where: {
        id_usuario:
          userId,
      },

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
            },
          ],
        },
        {
          association:
            'domicilios',

          where: {
            estado_domicilio:
              'ACTIVO',
          },

          required: false,

          include: [
            {
              association:
                'zona',
            },
            {
              association:
                'ruta',

              required: false,
            },
          ],
        },
        {
          association:
            'preferencias_notificacion',

          required: false,
        },
      ],

      order: [
        [
          {
            model:
              db.CiudadanoDomicilio,

            as:
              'domicilios',
          },

          'es_principal',
          'DESC',
        ],
      ],
    });

  if (!ciudadano) {
    throw new AppError(
      'El perfil ciudadano no fue encontrado.',
      404,
      'CITIZEN_PROFILE_NOT_FOUND',
    );
  }

  return ciudadano;
};

module.exports = getMyCitizenProfileService;