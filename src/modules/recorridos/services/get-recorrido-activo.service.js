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
// Devuelve el detalle o null cuando no existe uno activo.
// =======================================================
const getRecorridoActivoService = async ({
  id_usuario,
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const recorrido = await getActiveRecorridoForUser(
    userId,
  );

  // No tener recorrido activo es una situación válida.
  if (!recorrido) {
    return null;
  }

  const detalle = await getRecorridoDetail(
    recorrido.id_recorrido,
  );

  // No confundir un detalle ausente con una consulta sin recorrido.
  if (!detalle) {
    throw new AppError(
      'No se pudo obtener el detalle del recorrido activo.',
      404,
      'ACTIVE_ROUTE_DETAIL_NOT_FOUND',
    );
  }

  return detalle;
};

module.exports = getRecorridoActivoService;