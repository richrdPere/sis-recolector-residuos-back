const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const getRutaByIdService = require("./get-ruta-by-id.service");

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
// SERVICE: Actualizar ruta
// ===============================================
const updateRutaService = async (
  idRuta,
  payload,
) => {
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

  const data = {};

  if (
    payload.id_zona !==
    undefined
  ) {
    const idZona =
      validateId(
        payload.id_zona,
        'identificador de la zona',
      );

    const zona =
      await Zona.findByPk(
        idZona,
      );

    if (
      !zona ||
      !zona.estado
    ) {
      throw new AppError(
        'La zona no existe o se encuentra inactiva.',
        409,
        'ZONE_NOT_AVAILABLE',
      );
    }

    data.id_zona = idZona;
  }

  if (
    payload.codigo !==
    undefined
  ) {
    const codigo =
      normalizeCode(
        payload.codigo,
      );

    const duplicate =
      await Ruta.findOne({
        where: {
          codigo,

          id_ruta: {
            [Op.ne]: id,
          },
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

    data.codigo = codigo;
  }

  if (
    payload.nombre !==
    undefined
  ) {
    const nombre =
      normalizeText(
        payload.nombre,
      );

    if (!nombre) {
      throw new AppError(
        'El nombre de la ruta no puede estar vacío.',
        400,
        'ROUTE_NAME_REQUIRED',
      );
    }

    data.nombre = nombre;
  }

  if (
    payload.descripcion !==
    undefined
  ) {
    data.descripcion =
      payload.descripcion
        ?.trim() || null;
  }

  if (
    payload.color !==
    undefined
  ) {
    data.color =
      payload.color;
  }

  if (!Object.keys(data).length) {
    throw new AppError(
      'No se proporcionaron campos para actualizar.',
      400,
      'NO_UPDATE_FIELDS',
    );
  }

  await ruta.update(data);

  return getRutaByIdService(id);
};

module.exports = updateRutaService;