
const {
    getConductoresDisponiblesService,
    getRecolectoresDisponiblesService,
    getPersonalByRolService,
} = require('./disponibilidad.service');

const getUsuariosSinPersonalService = require("../../../usuarios/services/get-usuarios-sin-personal.service");

module.exports = {
    getConductoresDisponiblesService,
    getRecolectoresDisponiblesService,
    getPersonalByRolService,
    getUsuariosSinPersonalService,
};