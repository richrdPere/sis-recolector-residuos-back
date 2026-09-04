const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/tracking.validation');

// Utils
const { getRecorridoOrFail } = require('../utils/tracking-service.utils');

// Modelos
const { RecorridoUltimaUbicacion } = db;

// ===============================================
// Service: Obtener última ubicación
// ===============================================
const getLastLocationService = async (idRecorrido) => {
  const recorridoId =
    validateId(
      idRecorrido,
      'identificador del recorrido',
    );

  await getRecorridoOrFail(
    recorridoId,
  );

  const lastLocation =
    await RecorridoUltimaUbicacion
      .findOne({
        where: {
          id_recorrido:
            recorridoId,
        },

        include: [
          {
            association:
              'usuario',

            attributes: [
              'id_usuario',
              'username',
            ],

            required:
              false,
          },
        ],
      });

  if (!lastLocation) {
    throw new AppError(
      'El recorrido todavía no tiene ubicaciones registradas.',
      404,
      'LAST_LOCATION_NOT_FOUND',
    );
  }

  return lastLocation;
};

module.exports = getLastLocationService;