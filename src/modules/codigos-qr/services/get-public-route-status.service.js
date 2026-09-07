// services/get-public-route-status.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validation
const {
  validateId,
} = require('../validations/codigo-qr.validation');

// Utils
const {
  getPeruDateOnly,
  mapProgrammingState,
} = require('../utils/public-consultation.utils');

// Modelos
const {
  Ruta,
  ProgramacionRuta,
  Recorrido,
} = db;

// ===============================================
// SERVICE: Obtener estado publico de ruta
// ===============================================
const getPublicRouteStatusService = async ({
  id_ruta,
  fecha_referencia = null,
}) => {
  const routeId =
    validateId(
      id_ruta,
      'identificador de la ruta',
    );

  const referenceDate =
    fecha_referencia ||
    getPeruDateOnly();

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

  /*
   * Primero buscamos una programación del día.
   */

  let programacion =
    await ProgramacionRuta
      .findOne({
        where: {
          id_ruta:
            routeId,

          fecha_programada:
            referenceDate,
        },

        order: [
          [
            'hora_inicio_programada',
            'ASC',
          ],
        ],
      });

  /*
   * Si no existe para hoy, devolvemos la próxima programación.
   */

  if (!programacion) {
    programacion =
      await ProgramacionRuta
        .findOne({
          where: {
            id_ruta:
              routeId,

            fecha_programada: {
              [Op.gt]:
                referenceDate,
            },

            estado_programacion: {
              [Op.notIn]: [
                'FINALIZADA',
                'CANCELADA',
              ],
            },
          },

          order: [
            [
              'fecha_programada',
              'ASC',
            ],
            [
              'hora_inicio_programada',
              'ASC',
            ],
          ],
        });
  }

  if (!programacion) {
    return {
      disponible: false,

      codigo:
        'SIN_PROGRAMACION',

      mensaje:
        'No existe una programación próxima disponible para esta ruta.',

      programacion:
        null,

      recorrido:
        null,
    };
  }

  const publicState =
    mapProgrammingState(
      programacion
        .estado_programacion,
    );

  const recorrido =
    await Recorrido.findOne({
      where: {
        id_programacion:
          programacion
            .id_programacion,
      },

      attributes: [
        'estado_recorrido',
        'fecha_hora_inicio',
        'fecha_hora_finalizacion',
      ],
    });

  return {
    disponible: true,

    codigo:
      publicState.codigo,

    mensaje:
      publicState.mensaje,

    programacion: {
      fecha_programada:
        programacion
          .fecha_programada,

      hora_inicio:
        programacion
          .hora_inicio_programada,

      hora_fin:
        programacion
          .hora_fin_programada,

      turno:
        programacion.turno,
    },

    recorrido:
      recorrido
        ? {
          estado:
            recorrido
              .estado_recorrido,

          fecha_hora_inicio:
            recorrido
              .fecha_hora_inicio,

          fecha_hora_finalizacion:
            recorrido
              .fecha_hora_finalizacion,
        }
        : null,
  };
};

module.exports = getPublicRouteStatusService;