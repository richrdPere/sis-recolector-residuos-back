// services/create-citizen-address.service.js

const db = require('../../../database/models');

// Validations
const {
  validateId,
  validateCoordinates,
  validateRequiredText,
} = require('../validations/ciudadano.validation');

// Utils
const {
  getCitizenByUserOrFail,
  validateZoneAndRoute,
} = require('../utils/ciudadano-service.utils');

// Models
const {
  CiudadanoDomicilio,
  sequelize,
} = db;

// ===============================================
// SERVICE: Crear domicilio
// ===============================================
const createCitizenAddressService = async ({
  id_usuario,
  id_zona,
  id_ruta = null,
  nombre_domicilio =
  'Domicilio principal',
  direccion,
  referencia = null,
  latitud,
  longitud,
  precision_ubicacion = null,
  origen_ubicacion = 'MAPA',
  es_principal = false,
  observacion = null,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const zoneId =
    validateId(
      id_zona,
      'identificador de la zona',
    );

  const routeId =
    id_ruta
      ? validateId(
        id_ruta,
        'identificador de la ruta',
      )
      : null;

  const coordinates =
    validateCoordinates({
      latitud,
      longitud,
    });

  const normalizedAddress =
    validateRequiredText(
      direccion,
      'dirección',
      300,
    );

  const normalizedName =
    validateRequiredText(
      nombre_domicilio,
      'nombre del domicilio',
      100,
    );

  const transaction =
    await sequelize.transaction();

  try {
    const ciudadano =
      await getCitizenByUserOrFail(
        userId,
        {
          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        },
      );

    await validateZoneAndRoute({
      idZona:
        zoneId,

      idRuta:
        routeId,

      transaction,
    });

    const activeAddresses =
      await CiudadanoDomicilio
        .count({
          where: {
            id_ciudadano:
              ciudadano
                .id_ciudadano,

            estado_domicilio:
              'ACTIVO',
          },

          transaction,
        });

    const shouldBePrimary =
      activeAddresses === 0 ||
      Boolean(
        es_principal,
      );

    if (shouldBePrimary) {
      await CiudadanoDomicilio
        .update(
          {
            es_principal:
              false,
          },
          {
            where: {
              id_ciudadano:
                ciudadano
                  .id_ciudadano,
            },

            transaction,
          },
        );
    }

    const domicilio =
      await CiudadanoDomicilio
        .create(
          {
            id_ciudadano:
              ciudadano
                .id_ciudadano,

            id_zona:
              zoneId,

            id_ruta:
              routeId,

            nombre_domicilio:
              normalizedName,

            direccion:
              normalizedAddress,

            referencia:
              referencia
                ?.trim() ||
              null,

            latitud:
              coordinates
                .latitud,

            longitud:
              coordinates
                .longitud,

            precision_ubicacion:
              precision_ubicacion ??
              null,

            origen_ubicacion:
              String(
                origen_ubicacion,
              ).toUpperCase(),

            es_principal:
              shouldBePrimary,

            estado_domicilio:
              'ACTIVO',

            observacion:
              observacion
                ?.trim() ||
              null,
          },
          {
            transaction,
          },
        );

    await transaction.commit();

    return domicilio;
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = createCitizenAddressService;