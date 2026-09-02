const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const { RutaVersion } = db;

// ===============================================
// SERVICE: Actualizar ruta version
// ===============================================
const updateRutaVersionService = async (
  idVersion,
  payload,
) => {
  const id = validateId(
    idVersion,
    'identificador de la versión',
  );

  const version =
    await RutaVersion.findByPk(
      id,
    );

  if (!version) {
    throw new AppError(
      'La versión de la ruta no fue encontrada.',
      404,
      'ROUTE_VERSION_NOT_FOUND',
    );
  }

  if (version.vigente) {
    throw new AppError(
      'No se puede modificar una versión vigente.',
      409,
      'CURRENT_VERSION_CANNOT_BE_UPDATED',
    );
  }

  const allowedFields = [
    'geometria_geojson',
    'distancia_estimada_km',
    'duracion_estimada_min',
    'fecha_vigencia_desde',
    'fecha_vigencia_hasta',
  ];

  const data = {};

  allowedFields.forEach(
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
    payload.observacion !==
    undefined
  ) {
    data.observacion =
      payload.observacion
        ?.trim() || null;
  }

  if (!Object.keys(data).length) {
    throw new AppError(
      'No se proporcionaron campos para actualizar.',
      400,
      'NO_UPDATE_FIELDS',
    );
  }

  await version.update(data);

  return version;
};

module.exports = updateRutaVersionService;