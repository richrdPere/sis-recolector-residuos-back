const cancelarMantenimientoService = require('./cancelar-mantenimiento.service');
const createMantenimientoService = require("./create-mantenimiento.service");
const finalizarMantenimientoService = require("./finalizar-mantenimiento.service");
const getMantenimientoByIdService = require("./get-mantenimiento-by-id.service");
const getMantenimientosByVehiculoService = require("./get-mantenimientos-by-vehiculo.service");
const getMantenimientosPaginatedService = require("./get-mantenimientos-paginated.service");
const getMantenimientosProximosService = require("./get-mantenimientos-proximos.service");
const iniciarMantenimientoService = require("./iniciar-mantenimiento.service");
const updateMantenimientoService = require("./update-mantenimiento.service");


module.exports = {
    cancelarMantenimientoService,
    createMantenimientoService,
    finalizarMantenimientoService,
    getMantenimientoByIdService,
    getMantenimientosByVehiculoService,
    getMantenimientosPaginatedService,
    getMantenimientosProximosService,
    iniciarMantenimientoService,
    updateMantenimientoService,
}