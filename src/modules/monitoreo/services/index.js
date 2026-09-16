const monitoringServices = require('./monitoreo');
const dashboardServices = require('./dashboard');

module.exports = {
  ...monitoringServices,
  ...dashboardServices,
};