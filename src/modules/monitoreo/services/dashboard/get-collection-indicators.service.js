// Validations
const { validateDashboardFilters } = require('../../validations/dashboard.validation');

// Utils
const {
  getDashboardDataset,
  aggregateCollectionIndicators,
} = require('../../utils/dashboard-service.utils');

// =======================================================
// SERVICE: Obtener incidadores de recoleccion
// =======================================================
const getCollectionIndicatorsService = async (filters = {}) => {
  const normalizedFilters =
    validateDashboardFilters(filters);

  const dataset = await getDashboardDataset(
    normalizedFilters,
  );

  return {
    periodo: normalizedFilters,
    indicadores:
      aggregateCollectionIndicators(dataset),
  };
};

module.exports = getCollectionIndicatorsService;