const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  normalizeCode,
  normalizeText,
} = require('../../utils/rutas-service.utils');

// Modelos
const { Zona } = db;

// ===============================================
// SERVICE: Crear zona
// ===============================================
const createZonaService = async ({
  codigo,
  nombre,
  descripcion = null,
  color = '#1976D2',
  poligono_geojson = null,
  centro_latitud = null,
  centro_longitud = null,
}) => {
  const normalizedCode =
    normalizeCode(codigo);

  const normalizedName =
    normalizeText(nombre);

  if (
    !normalizedCode ||
    !normalizedName
  ) {
    throw new AppError(
      'El código y nombre de la zona son obligatorios.',
      400,
      'ZONE_REQUIRED_FIELDS',
    );
  }

  const duplicada =
    await Zona.findOne({
      where: {
        [Op.or]: [
          {
            codigo:
              normalizedCode,
          },
          {
            nombre:
              normalizedName,
          },
        ],
      },

      paranoid: false,
    });

  if (duplicada) {
    const code =
      duplicada.codigo ===
        normalizedCode
        ? 'ZONE_CODE_ALREADY_EXISTS'
        : 'ZONE_NAME_ALREADY_EXISTS';

    throw new AppError(
      code ===
        'ZONE_CODE_ALREADY_EXISTS'
        ? 'El código de la zona ya está registrado.'
        : 'El nombre de la zona ya está registrado.',
      409,
      code,
    );
  }

  return Zona.create({
    codigo: normalizedCode,
    nombre: normalizedName,

    descripcion:
      descripcion?.trim() ||
      null,

    color,
    poligono_geojson,
    centro_latitud,
    centro_longitud,
    estado: true,
  });
};


module.exports = createZonaService;