const AppError = require('../../../utils/app-error');

// Validation
const { validateId } = require('../validations/recorrido.validation');

// Utils
const {
  getActiveRecorridoForUser,
  getRecorridoDetail,
} = require(
  '../utils/recorrido-service.utils',
);

// =======================================================
// Service: Obtener recorrido activo
// =======================================================
const getRecorridoActivoService = async ({
  id_usuario,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const recorrido =
    await getActiveRecorridoForUser(
      userId,
    );

  if (!recorrido) {
    throw new AppError(
      'El usuario no tiene un recorrido activo.',
      404,
      'ACTIVE_ROUTE_NOT_FOUND',
    );
  }

  return getRecorridoDetail(
    recorrido.id_recorrido,
  );
};

module.exports = getRecorridoActivoService;