// Validations
const {
  validateDashboardFilters,
  normalizePagination,
} = require('../../validations/dashboard.validation');

// Utils
const {
  getDashboardDataset,
  buildRoutePerformance,
} = require('../../utils/dashboard-service.utils');

// Constans
const ALLOWED_ORDER_FIELDS = [
  'ruta',
  'programaciones',
  'cumplimiento_porcentaje',
  'avance_porcentaje',
  'duracion_promedio_minutos',
  'distancia_promedio_km',
];

// =======================================================
// SERVICE: Obtener ruta
// =======================================================
const getRoutePerformanceService = async (filters = {}) => {

  const normalizedFilters = validateDashboardFilters(filters);
  const pagination = normalizePagination(filters);

  const orderBy = ALLOWED_ORDER_FIELDS.includes(
    filters.order_by,
  )
    ? filters.order_by
    : 'cumplimiento_porcentaje';

  const direction =
    String(filters.order_direction || 'DESC').toUpperCase() === 'ASC'
      ? 'ASC'
      : 'DESC';

  const dataset = await getDashboardDataset(
    normalizedFilters,
  );

  const rows = buildRoutePerformance(dataset);

  rows.sort((a, b) => {
    const left = a[orderBy];
    const right = b[orderBy];

    const comparison = typeof left === 'string'
      ? left.localeCompare(right)
      : toComparable(left) - toComparable(right);

    return direction === 'ASC'
      ? comparison
      : -comparison;
  });

  const total = rows.length;

  return {
    periodo: normalizedFilters,
    items: rows.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    ),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      total_pages: Math.ceil(total / pagination.limit),
    },
  };
};

const toComparable = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

module.exports = getRoutePerformanceService;