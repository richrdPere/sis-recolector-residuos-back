const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  parseBoolean,
  normalizeText,
} = require('../../utils/rutas-service.utils');

// Modelos
const { Zona } = db;

// ===============================================
// SERVICE: Obtener zonas + paginado
// ===============================================
const getZonasPaginatedService = async ({
  page = 1,
  limit = 10,
  search = '',
  estado,
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
        descripcion: {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
    ];
  }

  if (
    estado !== undefined &&
    estado !== ''
  ) {
    where.estado =
      parseBoolean(estado);
  }

  const {
    count,
    rows,
  } =
    await Zona.findAndCountAll({
      where,

      limit: currentLimit,

      offset:
        (currentPage - 1) *
        currentLimit,

      order: [
        ['nombre', 'ASC'],
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

module.exports = getZonasPaginatedService;