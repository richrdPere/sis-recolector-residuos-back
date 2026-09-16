
// Service
const getOperationalMonitorService = require('./get-operational-monitor.service');

// Validations
const {
  validateAlertFilters,
  normalizePagination,
} = require('../../validations/monitoreo.validation');

// Utils
const { buildOperationalAlerts } = require('../../utils/monitoreo-service.utils');


// ==============================================================
// SERVICE: Obtener alertas de las operaciones
// ==============================================================
const getOperationalAlertsService = async (filters = {}) => {

  const normalizedFilters = validateAlertFilters(filters);

  const pagination = normalizePagination(filters);

  const monitor = await getOperationalMonitorService({
    ...normalizedFilters,
    solo_alertas: false,
  });

  let alerts = buildOperationalAlerts(monitor.items);

  if (normalizedFilters.nivel) {
    alerts = alerts.filter(
      (alert) =>
        alert.nivel === normalizedFilters.nivel,
    );
  }

  const levelWeight = {
    CRITICA: 3,
    ADVERTENCIA: 2,
    INFORMATIVA: 1,
  };

  alerts.sort(
    (a, b) =>
      levelWeight[b.nivel] -
      levelWeight[a.nivel],
  );

  const total = alerts.length;
  const items = alerts.slice(
    pagination.offset,
    pagination.offset + pagination.limit,
  );

  return {
    resumen: {
      total,
      criticas: alerts.filter(
        (alert) => alert.nivel === 'CRITICA',
      ).length,
      advertencias: alerts.filter(
        (alert) => alert.nivel === 'ADVERTENCIA',
      ).length,
      informativas: alerts.filter(
        (alert) => alert.nivel === 'INFORMATIVA',
      ).length,
    },

    items,

    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      total_pages: Math.ceil(
        total / pagination.limit,
      ),
    },
  };
};

module.exports = getOperationalAlertsService;