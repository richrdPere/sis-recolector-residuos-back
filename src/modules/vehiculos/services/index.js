const createVehiculoService = require('./create-vehiculo.service');
const getVehiculosPaginadoService = require('./get-vehiculos-paginado.service');
const getVehiculoByIdService = require('./get-vehiculo-by-id.service');
const updateVehiculoService = require('./update-vehiculo.service');
const changeEstadoVehiculoService = require('./change-estado-vehiculo.service');
const deleteVehiculoService = require('./delete-vehiculo.service');

module.exports = {
    changeEstadoVehiculoService,
    createVehiculoService,
    deleteVehiculoService,
    getVehiculoByIdService,
    getVehiculosPaginadoService,
    updateVehiculoService,
};