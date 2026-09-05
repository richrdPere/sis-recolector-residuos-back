// services/update-citizen-address.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
  validateCoordinates,
} = require('../validations/ciudadano.validation');

// Utils
const {
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
  validateZoneAndRoute,
} = require('../utils/ciudadano-service.utils');

// Modelos
const {
  CiudadanoDomicilio,
  sequelize,
} = db;

// ===============================================
// SERVICE: Actualizar domicilio
// ===============================================
const updateCitizenAddressService =
  async ({
    id_usuario,
    id_domicilio,
    ...payload
  }) => {
    const userId =
      validateId(
        id_usuario,
        'identificador del usuario',
      );

    const addressId =
      validateId(
        id_domicilio,
        'identificador del domicilio',
      );

    const transaction =
      await sequelize.transaction();

    try {
      const ciudadano =
        await getCitizenByUserOrFail(
          userId,
          {
            transaction,
          },
        );

      const domicilio =
        await getAddressOwnedOrFail({
          idDomicilio:
            addressId,

          idCiudadano:
            ciudadano
              .id_ciudadano,

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

      const finalZoneId =
        payload.id_zona !==
          undefined
          ? validateId(
            payload.id_zona,
            'identificador de la zona',
          )
          : domicilio.id_zona;

      const finalRouteId =
        payload.id_ruta !==
          undefined
          ? payload.id_ruta
            ? validateId(
              payload.id_ruta,
              'identificador de la ruta',
            )
            : null
          : domicilio.id_ruta;

      await validateZoneAndRoute({
        idZona:
          finalZoneId,

        idRuta:
          finalRouteId,

        transaction,
      });

      const updateData = {
        id_zona:
          finalZoneId,

        id_ruta:
          finalRouteId,
      };

      if (
        payload.nombre_domicilio !==
        undefined
      ) {
        updateData
          .nombre_domicilio =
          String(
            payload
              .nombre_domicilio,
          ).trim();
      }

      if (
        payload.direccion !==
        undefined
      ) {
        updateData.direccion =
          String(
            payload.direccion,
          ).trim();
      }

      if (
        payload.referencia !==
        undefined
      ) {
        updateData.referencia =
          payload.referencia
            ?.trim() ||
          null;
      }

      if (
        payload.latitud !==
        undefined ||
        payload.longitud !==
        undefined
      ) {
        const coordinates =
          validateCoordinates({
            latitud:
              payload.latitud ??
              domicilio.latitud,

            longitud:
              payload.longitud ??
              domicilio
                .longitud,
          });

        updateData.latitud =
          coordinates.latitud;

        updateData.longitud =
          coordinates.longitud;

        updateData
          .ubicacion_validada =
          false;

        updateData
          .fecha_validacion =
          null;

        updateData
          .id_usuario_validacion =
          null;
      }

      if (
        payload.precision_ubicacion !==
        undefined
      ) {
        updateData
          .precision_ubicacion =
          payload
            .precision_ubicacion;
      }

      if (
        payload.origen_ubicacion !==
        undefined
      ) {
        updateData
          .origen_ubicacion =
          String(
            payload
              .origen_ubicacion,
          ).toUpperCase();
      }

      if (
        payload.observacion !==
        undefined
      ) {
        updateData.observacion =
          payload.observacion
            ?.trim() ||
          null;
      }

      if (
        payload.estado_domicilio !==
        undefined
      ) {
        const nextState =
          String(
            payload
              .estado_domicilio,
          ).toUpperCase();

        if (
          ![
            'ACTIVO',
            'INACTIVO',
          ].includes(
            nextState,
          )
        ) {
          throw new AppError(
            'El estado del domicilio no es válido.',
            400,
            'INVALID_ADDRESS_STATE',
          );
        }

        if (
          domicilio
            .es_principal &&
          nextState ===
          'INACTIVO'
        ) {
          throw new AppError(
            'No puede desactivar el domicilio principal. Primero seleccione otro domicilio principal.',
            409,
            'PRIMARY_ADDRESS_CANNOT_BE_DISABLED',
          );
        }

        updateData
          .estado_domicilio =
          nextState;
      }

      if (
        payload.es_principal ===
        true
      ) {
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

        updateData.es_principal =
          true;

        updateData
          .estado_domicilio =
          'ACTIVO';
      }

      await domicilio.update(
        updateData,
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

module.exports = updateCitizenAddressService;