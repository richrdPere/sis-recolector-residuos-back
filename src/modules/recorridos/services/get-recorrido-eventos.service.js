const db = require('../../../database/models');

// Validations
const { validateId } = require('../validations/recorrido.validation');

// Utils
const { getRecorridoOrFail } = require('../utils/recorrido-service.utils');

// Modelos
const { RecorridoEvento } = db;

// =======================================================
// Service: Obtener recorrido eventos
// =======================================================
const getRecorridoEventosService = async ({
  id_recorrido,
  page = 1,
  limit = 20,
  tipo_evento = null,
}) => {
  const recorridoId =
    validateId(
      id_recorrido,
      'identificador del recorrido',
    );

  await getRecorridoOrFail(
    recorridoId,
  );

  const normalizedPage =
    Math.max(
      Number(page) || 1,
      1,
    );

  const normalizedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1,
      ),
      100,
    );

  const where = {
    id_recorrido:
      recorridoId,
  };

  if (tipo_evento) {
    where.tipo_evento =
      String(tipo_evento)
        .trim()
        .toUpperCase();
  }

  const {
    rows,
    count,
  } =
    await RecorridoEvento
      .findAndCountAll({
        where,

        include: [
          {
            association:
              'usuario',

            attributes: [
              'id_usuario',
              'username',
            ],

            required: false,
          },
        ],

        order: [
          [
            'fecha_evento',
            'DESC',
          ],
        ],

        limit:
          normalizedLimit,

        offset:
          (
            normalizedPage - 1
          ) *
          normalizedLimit,
      });

  return {
    items: rows,

    pagination: {
      page:
        normalizedPage,

      limit:
        normalizedLimit,

      total:
        count,

      total_pages:
        Math.ceil(
          count /
          normalizedLimit,
        ),
    },
  };
};

module.exports = getRecorridoEventosService;