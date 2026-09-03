const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recorrido.validation');

// Utils
const { getRecorridoDetail } = require('../utils/recorrido-service.utils');

// =======================================================
// Service: Obtener recorrido by id
// =======================================================
const getRecorridoByIdService = async ({
  id_recorrido,
}) => {
  const recorridoId =
    validateId(
      id_recorrido,
      'identificador del recorrido',
    );

  const recorrido =
    await getRecorridoDetail(
      recorridoId,
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_EXECUTION_NOT_FOUND',
    );
  }

  return recorrido;
};

module.exports = getRecorridoByIdService;