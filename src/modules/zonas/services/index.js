const changeZonaEstadoService = require("./change-zona-estado.service");
const createZonaService = require("./create-zona.service");
const deleteZonaService = require("./delete-zona.service");
const getZonaByIdService = require("./get-zona-by-id.service");
const getZonasActivasService = require("./get-zonas-activas.service");
const getZonasPaginatedService = require("./get-zonas-paginated.service");
const updateZonaService = require("./update-zona.service");
const getLastCodigoZonaService = require("./get-last-codigo-zona.service");

module.exports = {
    changeZonaEstadoService,
    createZonaService,
    deleteZonaService,
    getZonaByIdService,
    getZonasActivasService,
    getZonasPaginatedService,
    updateZonaService,
    getLastCodigoZonaService,
}