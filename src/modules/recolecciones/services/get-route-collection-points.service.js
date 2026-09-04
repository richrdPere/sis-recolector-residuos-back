// services/get-route-collection-points.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validation
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  Recorrido,
  ProgramacionRuta,
  RutaPunto,
  RecoleccionPunto,
} = db;

// ===============================================
// Services: Obtener puntos de ruta de recoleccion
// ===============================================
const getRouteCollectionPointsService = async (idRecorrido) => {
  const recorridoId =
    validateId(
      idRecorrido,
      'identificador del recorrido',
    );

  const recorrido =
    await Recorrido.findByPk(
      recorridoId,
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  const programacion =
    await ProgramacionRuta
      .findByPk(
        recorrido
          .id_programacion,
      );

  if (!programacion) {
    throw new AppError(
      'La programación asociada no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  const [
    points,
    collections,
  ] =
    await Promise.all([
      RutaPunto.findAll({
        where: {
          id_ruta_version:
            programacion
              .id_ruta_version,

          estado:
            true,
        },

        order: [
          [
            'id_ruta_punto',
            'ASC',
          ],
        ],
      }),

      RecoleccionPunto
        .findAll({
          where: {
            id_recorrido:
              recorridoId,

            estado_recoleccion:
              'REGISTRADA',

            id_ruta_punto: {
              [Op.ne]:
                null,
            },
          },
        }),
    ]);

  const collectionMap =
    new Map(
      collections.map(
        (
          collection,
        ) => [
            String(
              collection
                .id_ruta_punto,
            ),

            collection,
          ],
      ),
    );

  return points.map(
    (
      point,
    ) => {
      const plainPoint =
        point.get({
          plain:
            true,
        });

      const collection =
        collectionMap.get(
          String(
            point
              .id_ruta_punto,
          ),
        );

      return {
        ...plainPoint,

        estado_atencion:
          collection
            ? 'ATENDIDO'
            : 'PENDIENTE',

        recoleccion:
          collection ||
          null,
      };
    },
  );
};

module.exports = getRouteCollectionPointsService;