const changeRutaEstadoRutaService = require("./change-ruta-estado-ruta.service");
const changeRutaEstadoService = require("./change-ruta-estado.service");
const createRutaService = require("./create-ruta.service");
const deleteRutaService = require("./delete-ruta.service");
const getRutaByIdService = require("./get-ruta-by-id.service");
const getRutasActivasService = require("./get-rutas-activas.service");
const getRutasByZonaService = require("./get-rutas-by-zona.service");
const getRutasPaginatedService = require("./get-rutas-paginated.service");
const updateRutaService = require("./update-ruta.service");

module.exports = {
    changeRutaEstadoRutaService,
    changeRutaEstadoService,
    createRutaService,
    deleteRutaService,
    getRutaByIdService,
    getRutasActivasService,
    getRutasByZonaService,
    getRutasPaginatedService,
    updateRutaService,
}