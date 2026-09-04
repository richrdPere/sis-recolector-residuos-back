const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recorrido.validation');

// Utils
const { getRecorridoOrFail } = require('../utils/recorrido-service.utils');

// Modelos
const { RecorridoEvento } = db;

const EVENT_TYPES = [
  'INICIO',
  'PAUSA',
  'REANUDACION',
  'FINALIZACION',
  'CANCELACION',
];

// =======================================================
// Service: Obtener eventos de un recorrido
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

  // Confirmar que el recorrido existe.
  await getRecorridoOrFail(
    recorridoId,
  );

  // -------------------------------------------
  // Paginación
  // -------------------------------------------

  const parsedPage = Number.parseInt(
    page,
    10,
  );

  const parsedLimit = Number.parseInt(
    limit,
    10,
  );

  const normalizedPage = Number.isInteger(
    parsedPage,
  ) &&
    parsedPage > 0
    ? parsedPage
    : 1;

  const normalizedLimit = Number.isInteger(
    parsedLimit,
  ) &&
    parsedLimit > 0
    ? Math.min(
      parsedLimit,
      100,
    )
    : 20;

  // -------------------------------------------
  // Filtros
  // -------------------------------------------

  const where = {
    id_recorrido:
      recorridoId,
  };

  if (tipo_evento) {
    const normalizedEventType =
      String(
        tipo_evento,
      )
        .trim()
        .toUpperCase();

    if (
      !EVENT_TYPES.includes(
        normalizedEventType,
      )
    ) {
      throw new AppError(
        'El tipo de evento no es válido.',
        400,
        'INVALID_ROUTE_EVENT_TYPE',
      );
    }

    where.tipo_evento = normalizedEventType;
  }

  // -------------------------------------------
  // Consulta
  // -------------------------------------------
  const { rows, count } = await RecorridoEvento
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
        [
          'id_recorrido_evento',
          'DESC',
        ],
      ],

      limit:
        normalizedLimit,

      offset:
        (
          normalizedPage -
          1
        ) *
        normalizedLimit,
    });

  const totalPages =
    count > 0
      ? Math.ceil(
        count /
        normalizedLimit,
      )
      : 0;

  return {
    items: rows,

    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total: count,
      total_pages: totalPages,
      has_next_page: normalizedPage < totalPages,
      has_previous_page: normalizedPage > 1,
    },
  };
};

module.exports = getRecorridoEventosService;