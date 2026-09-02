const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  validateId,
  normalizeCode,
  normalizeText,
} = require('../../utils/rutas-service.utils');

const getEditableVersion = require("../../utils/ruta-horario/ruta-punto.utils");

// Modelos
const { RutaPunto } = db;

// ===============================================
// SERVICE: Crear ruta punto
// ===============================================
const createRutaPuntoService = async (
  idVersion,
  {
    codigo,
    nombre,
    descripcion = null,
    tipo_punto =
    'RECOLECCION',
    latitud,
    longitud,
    orden,
    radio_atencion_metros =
    30,
    tiempo_estimado_min =
    null,
    obligatorio = true,
  },
) => {
  const versionId =
    validateId(
      idVersion,
      'identificador de la versión',
    );

  await getEditableVersion(
    versionId,
  );

  const normalizedCode =
    normalizeCode(codigo);

  const normalizedName =
    normalizeText(nombre);

  if (
    !normalizedCode ||
    !normalizedName ||
    latitud === undefined ||
    longitud === undefined ||
    orden === undefined
  ) {
    throw new AppError(
      'Código, nombre, coordenadas y orden son obligatorios.',
      400,
      'ROUTE_POINT_REQUIRED_FIELDS',
    );
  }

  const duplicate =
    await RutaPunto.findOne({
      where: {
        id_ruta_version:
          versionId,

        estado: true,

        [Op.or]: [
          {
            codigo:
              normalizedCode,
          },
          {
            orden:
              Number(orden),
          },
        ],
      },
    });

  if (duplicate) {
    throw new AppError(
      duplicate.codigo ===
        normalizedCode
        ? 'El código del punto ya existe en la versión.'
        : 'El orden del punto ya existe en la versión.',
      409,
      duplicate.codigo ===
        normalizedCode
        ? 'ROUTE_POINT_CODE_ALREADY_EXISTS'
        : 'ROUTE_POINT_ORDER_ALREADY_EXISTS',
    );
  }

  return RutaPunto.create({
    id_ruta_version:
      versionId,

    codigo:
      normalizedCode,

    nombre:
      normalizedName,

    descripcion:
      descripcion?.trim() ||
      null,

    tipo_punto,
    latitud,
    longitud,
    orden:
      Number(orden),

    radio_atencion_metros,
    tiempo_estimado_min,
    obligatorio,
    estado: true,
  });
};

module.exports = createRutaPuntoService;