const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/tracking.validation');

// Utils
const { getRecorridoOrFail } = require('../utils/tracking-service.utils');

// Modelos
const { RecorridoPosicion } = db;

// ===============================================
// Service: Obtener posiciones del recorrido
// ===============================================
const getRoutePositionsService = async ({
  id_recorrido,
  page = 1,
  limit = 100,
  fecha_desde = null,
  fecha_hasta = null,
  solo_validas = true,
}) => {
  const recorridoId =
    validateId(
      id_recorrido,
      'identificador del recorrido',
    );

  await getRecorridoOrFail(
    recorridoId,
  );

  const parsedPage =
    Number.parseInt(
      page,
      10,
    );

  const parsedLimit =
    Number.parseInt(
      limit,
      10,
    );

  const currentPage =
    Number.isInteger(
      parsedPage,
    ) &&
      parsedPage > 0
      ? parsedPage
      : 1;

  const currentLimit =
    Number.isInteger(
      parsedLimit,
    ) &&
      parsedLimit > 0
      ? Math.min(
        parsedLimit,
        1000,
      )
      : 100;

  const where = {
    id_recorrido:
      recorridoId,
  };

  const onlyValid =
    solo_validas === true ||
    String(
      solo_validas,
    ).toLowerCase() ===
    'true';

  if (onlyValid) {
    where.es_valida =
      true;
  }

  if (
    fecha_desde ||
    fecha_hasta
  ) {
    where.fecha_dispositivo =
      {};

    if (fecha_desde) {
      const startDate =
        new Date(
          fecha_desde,
        );

      if (
        Number.isNaN(
          startDate.getTime(),
        )
      ) {
        throw new AppError(
          'La fecha desde no es válida.',
          400,
          'INVALID_START_DATE',
        );
      }

      where
        .fecha_dispositivo[
        Op.gte
      ] = startDate;
    }

    if (fecha_hasta) {
      const endDate =
        new Date(
          fecha_hasta,
        );

      if (
        Number.isNaN(
          endDate.getTime(),
        )
      ) {
        throw new AppError(
          'La fecha hasta no es válida.',
          400,
          'INVALID_END_DATE',
        );
      }

      where
        .fecha_dispositivo[
        Op.lte
      ] = endDate;
    }
  }

  const {
    rows,
    count,
  } =
    await RecorridoPosicion
      .findAndCountAll({
        where,

        attributes: [
          'id_posicion',
          'id_recorrido',
          'latitud',
          'longitud',
          'precision_gps',
          'altitud',
          'velocidad_mps',
          'rumbo',
          'nivel_bateria',
          'es_ubicacion_simulada',
          'fecha_dispositivo',
          'fecha_recepcion',
          'es_valida',
          'motivo_invalidez',
          'origen',
        ],

        order: [
          [
            'fecha_dispositivo',
            'ASC',
          ],
          [
            'id_posicion',
            'ASC',
          ],
        ],

        limit:
          currentLimit,

        offset:
          (
            currentPage -
            1
          ) *
          currentLimit,
      });

  const totalPages =
    count > 0
      ? Math.ceil(
        count /
        currentLimit,
      )
      : 0;

  return {
    items:
      rows,

    pagination: {
      page: currentPage,
      limit: currentLimit,
      total: count,
      total_pages: totalPages,
      has_next_page: currentPage < totalPages,
      has_previous_page: currentPage > 1,
    },
  };
};

module.exports = getRoutePositionsService;