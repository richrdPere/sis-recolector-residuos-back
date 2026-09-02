const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const { Ruta } = db;

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// ===============================================
// SERVICE: Cambiar ruta estado 
// ===============================================
const changeRutaEstadoService = async ({
  id_ruta,
  estado,
}) => {
  const id = validateId(
    id_ruta,
    'identificador de la ruta',
  );

  if (
    typeof estado !==
    'boolean'
  ) {
    throw new AppError(
      'El estado debe ser verdadero o falso.',
      400,
      'INVALID_ROUTE_RECORD_STATUS',
    );
  }

  const ruta =
    await Ruta.findByPk(id);

  if (!ruta) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  if (
    ruta.estado === estado
  ) {
    throw new AppError(
      'La ruta ya tiene el estado solicitado.',
      409,
      'ROUTE_RECORD_STATUS_NOT_CHANGED',
    );
  }

  if (
    !estado &&
    ruta.estado_ruta ===
    'ACTIVA'
  ) {
    throw new AppError(
      'Primero debe cambiar la ruta a INACTIVA.',
      409,
      'ACTIVE_ROUTE_CANNOT_BE_DISABLED',
    );
  }

  await ruta.update({
    estado,
  });

  return ruta;
};

module.exports = changeRutaEstadoService;