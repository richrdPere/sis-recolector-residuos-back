const registerLocationService = require('./register-location.service');
const registerLocationBatchService = require('./register-location-batch.service');
const getLastLocationService = require('./get-last-location.service');
const getRoutePositionsService = require('./get-route-positions.service');
const getActiveVehicleLocationsService = require('./get-active-vehicle-locations.service');

module.exports = {
    registerLocationService,
    registerLocationBatchService,
    getLastLocationService,
    getRoutePositionsService,
    getActiveVehicleLocationsService,
};