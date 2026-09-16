// Validations
const { validateDashboardFilters } = require('../../validations/dashboard.validation');

// Utils
const {
    getDashboardDataset,
    aggregateProgrammingIndicators,
} = require('../../utils/dashboard-service.utils');

// =======================================================
// SERVICE: Obtener indicadores de programacion
// =======================================================
const getProgrammingIndicatorsService = async (filters = {}) => {
    const normalizedFilters =
        validateDashboardFilters(filters);

    const dataset = await getDashboardDataset(
        normalizedFilters,
    );

    return {
        periodo: normalizedFilters,
        indicadores:
            aggregateProgrammingIndicators(dataset),
    };
};

module.exports = getProgrammingIndicatorsService;