const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  Zona,
  Ruta,
  RutaVersion,
} = db;

// Utils
const {
  validateId,
  parseBoolean,
  normalizeText,
  validateEnum,
} = require('../../utils/rutas-service.utils');

// Constans
const ESTADOS_RUTA = [
  'BORRADOR',
  'ACTIVA',
  'INACTIVA',
];

// ===============================================
// SERVICE: Obtener rutas paginado
// ===============================================
const getRutasPaginatedService = async ({
  page = 1,
  limit = 10,
  search = '',
  id_zona,
  estado,
  estado_ruta,
}) => {
  const currentPage =
    Number(page);

  const currentLimit =
    Number(limit);

  if (
    !Number.isInteger(
      currentPage,
    ) ||
    currentPage < 1 ||
    !Number.isInteger(
      currentLimit,
    ) ||
    currentLimit < 1 ||
    currentLimit > 100
  ) {
    throw new AppError(
      'Los parámetros de paginación no son válidos.',
      400,
      'INVALID_PAGINATION',
    );
  }

  const where = {};

  if (id_zona) {
    where.id_zona =
      validateId(
        id_zona,
        'identificador de la zona',
      );
  }

  if (
    estado !== undefined &&
    estado !== ''
  ) {
    where.estado =
      parseBoolean(estado);
  }

  if (estado_ruta) {
    validateEnum({
      value: estado_ruta,
      values: ESTADOS_RUTA,
      message:
        'El estado de la ruta no es válido.',
      code:
        'INVALID_ROUTE_STATUS',
    });

    where.estado_ruta =
      estado_ruta;
  }

  const searchValue =
    normalizeText(search);

  if (searchValue) {
    where[Op.or] = [
      {
        codigo: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        nombre: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$zona.nombre$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
    ];
  }

  const {
    count,
    rows,
  } =
    await Ruta.findAndCountAll({
      where,

      include: [
        {
          model: Zona,
          as: 'zona',

          attributes: [
            'id_zona',
            'codigo',
            'nombre',
            'color',
            'estado',
          ],
        },
        {
          model:
            RutaVersion,

          as:
            'version_vigente',

          required: false,

          attributes: [
            'id_ruta_version',
            'numero_version',
            'distancia_estimada_km',
            'duracion_estimada_min',
            'vigente',
          ],
        },
      ],

      distinct: true,
      subQuery: false,

      limit: currentLimit,

      offset:
        (currentPage - 1) *
        currentLimit,

      order: [
        ['created_at', 'DESC'],
      ],
    });

  const totalPages =
    Math.ceil(
      count / currentLimit,
    );

  return {
    items: rows,

    pagination: {
      total: count,
      page: currentPage,
      limit: currentLimit,

      total_pages:
        totalPages,

      has_next_page:
        currentPage <
        totalPages,

      has_previous_page:
        currentPage > 1,
    },
  };
};

module.exports = getRutasPaginatedService;
