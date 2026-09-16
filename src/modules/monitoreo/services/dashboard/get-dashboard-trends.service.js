// Validations
const { validateDashboardFilters } = require('../../validations/dashboard.validation');

// Utils
const {
    getDashboardDataset,
    buildTrendSeries,
} = require('../../utils/dashboard-service.utils');

// =======================================================
// SERVICE: Obtener dashboard
// =======================================================
const getDashboardTrendsService = async (filters = {}) => {
    const normalizedFilters =
        validateDashboardFilters(filters);

    const dataset = await getDashboardDataset(
        normalizedFilters,
    );

    return {
        periodo: normalizedFilters,
        agrupacion: normalizedFilters.agrupacion,
        series: buildTrendSeries(
            dataset,
            normalizedFilters.agrupacion,
        ),
    };
};

module.exports = getDashboardTrendsService;