// services/get-public-route-location.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');

const AppError = require('../../../utils/app-error');

// Validation
const { validateId } = require('../validations/codigo-qr.validation');

// Modelos
const {
  Ruta,
  Recorrido,
  RecorridoUltimaUbicacion,
} = db;


// ===============================================
// SERVICE: Ubicacion publica aproximada
// ===============================================
const getPublicRouteLocationService =
  async ({
    id_ruta,
  }) => {
    const routeId =
      validateId(
        id_ruta,
        'identificador de la ruta',
      );

    const ruta =
      await Ruta.findByPk(
        routeId,
      );

    if (!ruta) {
      throw new AppError(
        'La ruta no fue encontrada.',
        404,
        'ROUTE_NOT_FOUND',
      );
    }

    const recorrido =
      await Recorrido.findOne({
        where: {
          estado_recorrido: {
            [Op.in]: [
              'EN_CURSO',
              'PAUSADO',
            ],
          },
        },

        include: [
          {
            association:
              'programacion',

            attributes: [],

            where: {
              id_ruta:
                routeId,
            },

            required: true,
          },
        ],

        order: [
          [
            'fecha_hora_inicio',
            'DESC',
          ],
        ],
      });

    if (!recorrido) {
      return {
        disponible: false,

        motivo:
          'SIN_RECORRIDO_ACTIVO',

        mensaje:
          'El vehículo no está realizando actualmente esta ruta.',
      };
    }

    const location =
      await RecorridoUltimaUbicacion
        .findOne({
          where: {
            id_recorrido:
              recorrido
                .id_recorrido,
          },
        });

    if (!location) {
      return {
        disponible: false,

        motivo:
          'UBICACION_NO_DISPONIBLE',

        mensaje:
          'Todavía no existe una ubicación disponible para el vehículo.',
      };
    }

    const plainLocation =
      location.get({
        plain: true,
      });

    /*
     * Ajusta esta selección si tu modelo utiliza un único
     * nombre específico para la fecha de posición.
     */

    const locationDate =
      plainLocation
        .fecha_posicion ||
      plainLocation
        .fecha_ubicacion ||
      plainLocation
        .fecha_recepcion ||
      plainLocation
        .updated_at ||
      plainLocation
        .created_at;

    if (!locationDate) {
      return {
        disponible: false,

        motivo:
          'FECHA_UBICACION_NO_DISPONIBLE',

        mensaje:
          'No se pudo determinar la antigüedad de la ubicación.',
      };
    }

    const maxAgeMinutes =
      Math.max(
        Number(
          process.env
            .PUBLIC_LOCATION_MAX_AGE_MINUTES,
        ) || 5,
        1,
      );

    const ageMilliseconds =
      Date.now() -
      new Date(
        locationDate,
      ).getTime();

    const ageMinutes =
      ageMilliseconds /
      60000;

    if (
      ageMinutes >
      maxAgeMinutes
    ) {
      return {
        disponible: false,

        motivo:
          'UBICACION_DESACTUALIZADA',

        mensaje:
          'La última ubicación disponible está desactualizada.',

        ultima_actualizacion:
          locationDate,
      };
    }

    const configuredDecimals =
      Number(
        process.env
          .PUBLIC_LOCATION_DECIMALS,
      );

    const decimals =
      Number.isInteger(
        configuredDecimals,
      )
        ? Math.min(
          Math.max(
            configuredDecimals,
            2,
          ),
          4,
        )
        : 3;

    const latitude =
      Number(
        plainLocation.latitud,
      );

    const longitude =
      Number(
        plainLocation.longitud,
      );

    if (
      !Number.isFinite(
        latitude,
      ) ||
      !Number.isFinite(
        longitude,
      )
    ) {
      return {
        disponible: false,

        motivo:
          'COORDENADAS_NO_DISPONIBLES',

        mensaje:
          'La ubicación registrada no contiene coordenadas válidas.',
      };
    }

    return {
      disponible: true,

      latitud:
        Number(
          latitude.toFixed(
            decimals,
          ),
        ),

      longitud:
        Number(
          longitude.toFixed(
            decimals,
          ),
        ),

      ultima_actualizacion:
        locationDate,

      estado_recorrido:
        recorrido
          .estado_recorrido,

      es_aproximada:
        true,

      antiguedad_segundos:
        Math.max(
          Math.floor(
            ageMilliseconds /
            1000,
          ),
          0,
        ),
    };
  };

module.exports = getPublicRouteLocationService;