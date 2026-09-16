// Validations
const { validateDashboardFilters } = require('../../validations/dashboard.validation');

// Utils
const {
    getDashboardDataset,
    getVehiclesForDashboard,
    aggregateVehicleIndicators,
} = require('../../utils/dashboard-service.utils');

// =======================================================
// SERVICE: Obtener indicadores para vehiculos
// =======================================================
const getVehicleIndicatorsService = async (filters = {}) => {
    const normalizedFilters =
        validateDashboardFilters(filters);

    const [dataset, vehicles] = await Promise.all([
        getDashboardDataset(normalizedFilters),
        getVehiclesForDashboard(),
    ]);

    return {
        periodo: normalizedFilters,
        indicadores: aggregateVehicleIndicators(
            dataset,
            vehicles,
        ),
    };
};

module.exports = getVehicleIndicatorsService;