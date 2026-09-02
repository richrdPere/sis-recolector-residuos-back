const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
  Ruta,
  RutaVersion,
  sequelize,
} = db;

// ===============================================
// SERVICE: Crear ruta version 
// ===============================================
const createRutaVersionService = async (
  idRuta,
  {
    geometria_geojson,
    distancia_estimada_km =
    null,
    duracion_estimada_min =
    null,
    fecha_vigencia_desde,
    fecha_vigencia_hasta =
    null,
    observacion = null,
  },
) => {
  const id = validateId(
    idRuta,
    'identificador de la ruta',
  );

  if (
    !geometria_geojson ||
    !fecha_vigencia_desde
  ) {
    throw new AppError(
      'La geometría y fecha inicial de vigencia son obligatorias.',
      400,
      'ROUTE_VERSION_REQUIRED_FIELDS',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    const ruta =
      await Ruta.findByPk(
        id,
        {
          transaction,
          lock:
            transaction.LOCK
              .UPDATE,
        },
      );

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
        'Debe colocar la ruta en borrador o inactiva antes de crear una versión.',
        409,
        'ACTIVE_ROUTE_CANNOT_BE_VERSIONED',
      );
    }

    const maxVersion =
      await RutaVersion.max(
        'numero_version',
        {
          where: {
            id_ruta: id,
          },

          paranoid: false,
          transaction,
        },
      );

    const version =
      await RutaVersion.create(
        {
          id_ruta: id,

          numero_version:
            Number(
              maxVersion || 0,
            ) + 1,

          geometria_geojson,
          distancia_estimada_km,
          duracion_estimada_min,
          fecha_vigencia_desde,
          fecha_vigencia_hasta,

          observacion:
            observacion?.trim() ||
            null,

          vigente: false,
          estado: true,
        },
        {
          transaction,
        },
      );

    await transaction.commit();

    return version;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = createRutaVersionService;