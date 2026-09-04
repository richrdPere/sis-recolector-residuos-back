// services/get-route-progress.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  Recorrido,
  ProgramacionRuta,
  RutaPunto,
  RecoleccionPunto,
} = db;

// ===============================================
// Services: Obtener resumen de progreso
// ===============================================
const getRouteProgressService = async (idRecorrido) => {
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

  const points =
    await RutaPunto.findAll({
      where: {
        id_ruta_version:
          programacion
            .id_ruta_version,

        estado:
          true,
      },

      attributes: [
        'id_ruta_punto',
        'es_obligatorio',
      ],

      raw:
        true,
    });

  const registeredCollections =
    await RecoleccionPunto
      .findAll({
        where: {
          id_recorrido:
            recorridoId,

          estado_recoleccion:
            'REGISTRADA',
        },

        attributes: [
          'id_ruta_punto',
          'cantidad_recolectada',
          'unidad_medida',
        ],

        raw:
          true,
      });

  const collectedPointIds =
    new Set(
      registeredCollections.map(
        (
          item,
        ) =>
          String(
            item
              .id_ruta_punto,
          ),
      ),
    );

  const mandatoryPoints =
    points.filter(
      (
        point,
      ) =>
        point
          .es_obligatorio !==
        false,
    );

  const attendedMandatory =
    mandatoryPoints.filter(
      (
        point,
      ) =>
        collectedPointIds.has(
          String(
            point
              .id_ruta_punto,
          ),
        ),
    ).length;

  const totalMandatory =
    mandatoryPoints.length;

  const percentage =
    totalMandatory > 0
      ? Number(
        (
          attendedMandatory /
          totalMandatory *
          100
        ).toFixed(2),
      )
      : 0;

  const totalsByUnit = {};

  for (
    const item
    of registeredCollections
  ) {
    if (
      item
        .cantidad_recolectada ===
      null ||
      !item.unidad_medida
    ) {
      continue;
    }

    totalsByUnit[
      item.unidad_medida
    ] =
      (
        totalsByUnit[
        item.unidad_medida
        ] || 0
      ) +
      Number(
        item
          .cantidad_recolectada,
      );
  }

  return {
    id_recorrido:
      recorridoId,

    total_puntos:
      points.length,

    puntos_atendidos:
      collectedPointIds.size,

    puntos_pendientes:
      Math.max(
        points.length -
        collectedPointIds.size,
        0,
      ),

    puntos_obligatorios:
      totalMandatory,

    obligatorios_atendidos:
      attendedMandatory,

    obligatorios_pendientes:
      Math.max(
        totalMandatory -
        attendedMandatory,
        0,
      ),

    porcentaje_progreso:
      percentage,

    ruta_completada:
      totalMandatory > 0 &&
      attendedMandatory ===
      totalMandatory,

    cantidades_por_unidad:
      totalsByUnit,
  };
};

module.exports = getRouteProgressService;