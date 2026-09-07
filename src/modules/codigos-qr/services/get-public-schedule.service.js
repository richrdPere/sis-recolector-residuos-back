// services/get-public-schedule.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validation
const {
  validateId,
} = require(
  '../validations/codigo-qr.validation',
);

// Utils
const {
  getPeruDateOnly,
  parseDateOnly,
  formatDateOnly,
  addDays,
  findNextCollection,
  getRoutePublicName,
  getZonePublicName,
} = require(  '../utils/public-consultation.utils');

// Modelos
const {
  Zona,
  Ruta,
  RutaHorario,
} = db;

// ===============================================
// SERVICE: Obtener cronograma publico
// ===============================================
const getRouteSchedule =
  async ({
    ruta,
    referenceDate,
  }) => {
    const referenceDateOnly =
      formatDateOnly(
        referenceDate,
      );

    const searchEnd =
      formatDateOnly(
        addDays(
          referenceDate,
          90,
        ),
      );

    const horarios =
      await RutaHorario.findAll({
        where: {
          id_ruta:
            ruta.id_ruta,

          estado: true,

          [Op.and]: [
            {
              [Op.or]: [
                {
                  fecha_inicio:
                    null,
                },
                {
                  fecha_inicio: {
                    [Op.lte]:
                      searchEnd,
                  },
                },
              ],
            },
            {
              [Op.or]: [
                {
                  fecha_fin:
                    null,
                },
                {
                  fecha_fin: {
                    [Op.gte]:
                      referenceDateOnly,
                  },
                },
              ],
            },
          ],
        },

        order: [
          [
            'dia_semana',
            'ASC',
          ],
          [
            'hora_inicio',
            'ASC',
          ],
        ],
      });

    const scheduleData =
      horarios.map(
        (horario) => {
          const item =
            horario.get({
              plain: true,
            });

          return {
            dia_semana:
              item.dia_semana,

            hora_inicio:
              item.hora_inicio,

            hora_fin:
              item.hora_fin,

            frecuencia:
              item.frecuencia,

            fecha_inicio:
              item.fecha_inicio,

            fecha_fin:
              item.fecha_fin,
          };
        },
      );

    return {
      ruta: {
        id_ruta:
          ruta.id_ruta,

        nombre:
          getRoutePublicName(
            ruta,
          ),
      },

      horarios:
        scheduleData,

      proxima_recoleccion:
        findNextCollection({
          schedules:
            scheduleData,

          referenceDate,
        }),
    };
  };

const getPublicScheduleService =
  async ({
    id_zona = null,
    id_ruta = null,
    fecha_referencia = null,
  }) => {
    if (
      !id_zona &&
      !id_ruta
    ) {
      throw new AppError(
        'Debe indicar una zona o una ruta.',
        400,
        'PUBLIC_RESOURCE_REQUIRED',
      );
    }

    const referenceDateValue =
      fecha_referencia ||
      getPeruDateOnly();

    const referenceDate =
      parseDateOnly(
        referenceDateValue,
      );

    /*
     * Consulta para un QR de ruta.
     */

    if (id_ruta) {
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

      const routeSchedule =
        await getRouteSchedule({
          ruta,
          referenceDate,
        });

      return {
        fecha_consulta:
          formatDateOnly(
            referenceDate,
          ),

        tipo_recurso:
          'RUTA',

        rutas: [
          routeSchedule,
        ],
      };
    }

    /*
     * Consulta para un QR de zona.
     */

    const zoneId =
      validateId(
        id_zona,
        'identificador de la zona',
      );

    const zona =
      await Zona.findByPk(
        zoneId,
      );

    if (!zona) {
      throw new AppError(
        'La zona no fue encontrada.',
        404,
        'ZONE_NOT_FOUND',
      );
    }

    const rutas =
      await Ruta.findAll({
        where: {
          id_zona:
            zoneId,

          estado: true,
        },

        order: [
          [
            'id_ruta',
            'ASC',
          ],
        ],
      });

    const routeSchedules =
      await Promise.all(
        rutas.map(
          (ruta) =>
            getRouteSchedule({
              ruta,
              referenceDate,
            }),
        ),
      );

    return {
      fecha_consulta: formatDateOnly(referenceDate),
      tipo_recurso: 'ZONA',
      zona: {
        id_zona: zona.id_zona,
        nombre: getZonePublicName(zona),
      },
      rutas: routeSchedules,
    };
  };

module.exports = getPublicScheduleService;