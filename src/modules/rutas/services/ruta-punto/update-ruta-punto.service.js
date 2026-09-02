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
// SERVICE: Actualizar ruta punto
// ===============================================
const updateRutaPuntoService = async (
  idVersion,
  idPunto,
  payload,
) => {
  const versionId =
    validateId(
      idVersion,
      'identificador de la versión',
    );

  const pointId =
    validateId(
      idPunto,
      'identificador del punto',
    );

  await getEditableVersion(
    versionId,
  );

  const punto =
    await RutaPunto.findOne({
      where: {
        id_ruta_punto:
          pointId,

        id_ruta_version:
          versionId,
      },
    });

  if (!punto) {
    throw new AppError(
      'El punto no fue encontrado en la versión indicada.',
      404,
      'ROUTE_POINT_NOT_FOUND',
    );
  }

  const data = {};

  if (
    payload.codigo !==
    undefined
  ) {
    data.codigo =
      normalizeCode(
        payload.codigo,
      );
  }

  if (
    payload.nombre !==
    undefined
  ) {
    data.nombre =
      normalizeText(
        payload.nombre,
      );
  }

  const directFields = [
    'tipo_punto',
    'latitud',
    'longitud',
    'orden',
    'radio_atencion_metros',
    'tiempo_estimado_min',
    'obligatorio',
  ];

  directFields.forEach(
    (field) => {
      if (
        payload[field] !==
        undefined
      ) {
        data[field] =
          payload[field];
      }
    },
  );

  if (
    payload.descripcion !==
    undefined
  ) {
    data.descripcion =
      payload.descripcion
        ?.trim() || null;
  }

  if (!Object.keys(data).length) {
    throw new AppError(
      'No se proporcionaron campos para actualizar.',
      400,
      'NO_UPDATE_FIELDS',
    );
  }

  if (
    data.codigo ||
    data.orden !==
    undefined
  ) {
    const conditions = [];

    if (data.codigo) {
      conditions.push({
        codigo: data.codigo,
      });
    }

    if (
      data.orden !==
      undefined
    ) {
      conditions.push({
        orden:
          Number(data.orden),
      });
    }

    const duplicate =
      await RutaPunto.findOne({
        where: {
          id_ruta_version:
            versionId,

          id_ruta_punto: {
            [Op.ne]: pointId,
          },

          estado: true,

          [Op.or]:
            conditions,
        },
      });

    if (duplicate) {
      throw new AppError(
        'El código o el orden ya está siendo utilizado por otro punto.',
        409,
        'ROUTE_POINT_DUPLICATE',
      );
    }
  }

  await punto.update(data);

  return punto;
};


module.exports = updateRutaPuntoService;