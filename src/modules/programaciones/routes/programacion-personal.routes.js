const express = require('express');
const router = express.Router();

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Controllers
const {
    addProgramacionPersonalController,
    getProgramacionPersonalController,
    getMisAsignacionesController,
    removeProgramacionPersonalController,
    respondAssignmentController,
} = require('../controllers/programacion-personal.controller');

// Roles
const {
    ROLES_CONSULTA_ADMIN,
    ROLES_GESTION,
    ROLES_PERSONAL_OPERATIVO,
} = require('../validations/programacion.roles');

// Autenticación
router.use(verificarToken);

// *********************************************************
// MÓVIL - ASIGNACIONES PROPIAS
// *********************************************************
router.get(
    '/mis-asignaciones',
    autorizarRoles(...ROLES_PERSONAL_OPERATIVO),
    getMisAsignacionesController,
);

// El service debe verificar que la asignación pertenezca
// al usuario autenticado y permita responder en su estado actual.
router.patch(
    '/asignaciones/:idProgramacionPersonal/respuesta',
    autorizarRoles(...ROLES_PERSONAL_OPERATIVO),
    respondAssignmentController,
);

// *********************************************************
// WEB - CONSULTA DEL EQUIPO
// *********************************************************
router.get(
    '/:idProgramacion/personal',
    autorizarRoles(...ROLES_CONSULTA_ADMIN),
    getProgramacionPersonalController,
);

// *********************************************************
// WEB - GESTIÓN DEL EQUIPO
// *********************************************************
router.post(
    '/:idProgramacion/personal',
    autorizarRoles(...ROLES_GESTION),
    addProgramacionPersonalController,
);

router.patch(
    '/:idProgramacion/personal/:idProgramacionPersonal/retirar',
    autorizarRoles(...ROLES_GESTION),
    removeProgramacionPersonalController,
);

module.exports = router;