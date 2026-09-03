const addProgramacionPersonalService = require("./add-programacion-personal.service");
const getProgramacionPersonalService = require("./get-programacion-personal.service");
const getMisAsignacionesService = require("./get-mis-asignaciones-personal.service");
const removeProgramacionPersonalService = require("./remove-programacion-personal.service");
const respondAssignmentService = require("./respond-assignment.service");


module.exports = {
    addProgramacionPersonalService,
    getProgramacionPersonalService,
    getMisAsignacionesService,
    removeProgramacionPersonalService,
    respondAssignmentService,
}