const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const { Ruta } = db;

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// ===============================================
// SERVICE: Eliminar ruta  
// ===============================================
const deleteRutaService = async (idRuta) => {
  const id = validateId(
    idRuta,
    'identificador de la ruta',
  );

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
    ruta.estado_ruta ===
    'ACTIVA'
  ) {
    throw new AppError(
      'No se puede eliminar una ruta activa.',
      409,
      'ACTIVE_ROUTE_CANNOT_BE_DELETED',
    );
  }

  await ruta.destroy();

  return {
    id_ruta: id,
    deleted: true,
  };
};

module.exports = deleteRutaService;