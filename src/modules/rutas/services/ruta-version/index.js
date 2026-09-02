const activarRutaVersionService = require("./activar-ruta-version.service");
const createRutaVersionService = require("./create-ruta-version.service");
const deleteRutaVersionService = require("./delete-ruta-version.service");
const getRutaVersionVigenteService = require("./get-ruta-version-vigente.service");
const getRutaVersionesService = require("./get-ruta-versiones.service");
const updateRutaVersionService = require("./update-ruta-version.service");


module.exports = {
    activarRutaVersionService,
    createRutaVersionService,
    deleteRutaVersionService,
    getRutaVersionVigenteService,
    getRutaVersionesService,
    updateRutaVersionService,
}
