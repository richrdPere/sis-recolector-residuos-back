const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  Zona,
  Ruta,
} = db;

// Utils
const {
  validateId,
  normalizeCode,
  normalizeText,
} = require('../../utils/rutas-service.utils');


// ===============================================
// SERVICE: Crear ruta
// ===============================================
const createRutaService = async ({
  id_zona,
  codigo,
  nombre,
  descripcion = null,
  color = '#388E3C',
}) => {
  const idZona =
    validateId(
      id_zona,
      'identificador de la zona',
    );

  const zona =
    await Zona.findByPk(
      idZona,
    );

  if (!zona) {
    throw new AppError(
      'La zona no fue encontrada.',
      404,
      'ZONE_NOT_FOUND',
    );
  }

  if (!zona.estado) {
    throw new AppError(
      'No se puede registrar una ruta en una zona inactiva.',
      409,
      'ZONE_INACTIVE',
    );
  }

  const normalizedCode =
    normalizeCode(codigo);

  const normalizedName =
    normalizeText(nombre);

  if (
    !normalizedCode ||
    !normalizedName
  ) {
    throw new AppError(
      'La zona, código y nombre de la ruta son obligatorios.',
      400,
      'ROUTE_REQUIRED_FIELDS',
    );
  }

  const duplicate =
    await Ruta.findOne({
      where: {
        codigo:
          normalizedCode,
      },

      paranoid: false,
    });

  if (duplicate) {
    throw new AppError(
      'El código de la ruta ya está registrado.',
      409,
      'ROUTE_CODE_ALREADY_EXISTS',
    );
  }

  return Ruta.create({
    id_zona: idZona,
    codigo: normalizedCode,
    nombre: normalizedName,

    descripcion:
      descripcion?.trim() ||
      null,

    color,
    estado_ruta:
      'BORRADOR',

    estado: true,
  });
};


module.exports = createRutaService;