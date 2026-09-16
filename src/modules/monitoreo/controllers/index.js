const {
    getOperationalMonitorController,
    getActiveRoutesMapController,
    getRouteMonitorDetailController,
    getOperationalAlertsController,
} = require('./monitoreo.controller');

const {
    getDashboardSummaryController,
    getProgrammingIndicatorsController,
    getCollectionIndicatorsController,
    getVehicleIndicatorsController,
    getRoutePerformanceController,
    getDashboardTrendsController,
} = require('./dashboard.controller');


module.exports = {
    // Monitoreo
    getOperationalMonitorController,
    getActiveRoutesMapController,
    getRouteMonitorDetailController,
    getOperationalAlertsController,

    // Dashboard
    getDashboardSummaryController,
    getProgrammingIndicatorsController,
    getCollectionIndicatorsController,
    getVehicleIndicatorsController,
    getRoutePerformanceController,
    getDashboardTrendsController,
};