const AppError = require('../../../utils/app-error');

const {
  validateId,
  validateDate,
  normalizePagination,
} = require('./monitoreo.validation');

const GROUPINGS = [
  'DIA',
  'SEMANA',
  'MES',
];

const MAX_RANGE_DAYS =
  Number(process.env.DASHBOARD_MAX_RANGE_DAYS) || 366;

const formatDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const now = new Date();
  const end = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    1,
  ));

  return {
    fecha_inicio: formatDate(start),
    fecha_fin: formatDate(end),
  };
};

const daysBetweenInclusive = (start, end) => {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);

  return Math.floor(
    (endDate.getTime() - startDate.getTime()) / 86400000,
  ) + 1;
};

const validateGrouping = (value = 'DIA') => {
  const normalized = String(value || 'DIA')
    .trim()
    .toUpperCase();

  if (!GROUPINGS.includes(normalized)) {
    throw new AppError(
      'La agrupación del dashboard no es válida.',
      400,
      'INVALID_DASHBOARD_GROUPING',
      { allowed_values: GROUPINGS },
    );
  }

  return normalized;
};

const validateDashboardFilters = (filters = {}) => {
  const defaults = getDefaultRange();

  const fecha_inicio = validateDate(
    filters.fecha_inicio || defaults.fecha_inicio,
    'fecha inicial',
  );

  const fecha_fin = validateDate(
    filters.fecha_fin || defaults.fecha_fin,
    'fecha final',
  );

  if (fecha_inicio > fecha_fin) {
    throw new AppError(
      'La fecha inicial no puede ser posterior a la fecha final.',
      400,
      'INVALID_DASHBOARD_DATE_RANGE',
    );
  }

  const rangeDays = daysBetweenInclusive(
    fecha_inicio,
    fecha_fin,
  );

  if (rangeDays > MAX_RANGE_DAYS) {
    throw new AppError(
      `El periodo consultado no puede superar ${MAX_RANGE_DAYS} días.`,
      400,
      'DASHBOARD_DATE_RANGE_TOO_LARGE',
      { max_days: MAX_RANGE_DAYS },
    );
  }

  return {
    fecha_inicio,
    fecha_fin,
    dias_periodo: rangeDays,

    id_zona: validateId(
      filters.id_zona,
      'identificador de la zona',
      { required: false },
    ),

    id_ruta: validateId(
      filters.id_ruta,
      'identificador de la ruta',
      { required: false },
    ),

    id_vehiculo: validateId(
      filters.id_vehiculo,
      'identificador del vehículo',
      { required: false },
    ),

    agrupacion: validateGrouping(filters.agrupacion),
  };
};

module.exports = {
  GROUPINGS,
  validateGrouping,
  validateDashboardFilters,
  normalizePagination,
};