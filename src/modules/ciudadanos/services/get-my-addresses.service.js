// services/get-my-addresses.service.js

const db = require('../../../database/models');

// Validation
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
const {
  CiudadanoDomicilio,
} = db;

// ===============================================
// SERVICE: Obtener mis domicilios
// ===============================================
const getMyAddressesService = async ({
  id_usuario,
  incluir_inactivos = false,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const ciudadano =
    await getCitizenByUserOrFail(
      userId,
    );

  const where = {
    id_ciudadano:
      ciudadano
        .id_ciudadano,
  };

  if (!incluir_inactivos) {
    where.estado_domicilio =
      'ACTIVO';
  }

  return CiudadanoDomicilio
    .findAll({
      where,

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
        {
          association:
            'usuario_validacion',

          attributes: [
            'id_usuario',
            'username',
          ],

          required: false,
        },
      ],

      order: [
        [
          'es_principal',
          'DESC',
        ],
        [
          'created_at',
          'DESC',
        ],
      ],
    });
};

module.exports = getMyAddressesService;