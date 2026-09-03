const express = require('express');
const router = express.Router();

// Middlewares
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
} = require(
    '../controllers/programacion-personal.controller',
);

// Roles
const ROLES_CONSULTA = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

const ROLES_GESTION = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
];

const ROLES_PERSONAL = [
    'CONDUCTOR',
    'RECOLECTOR',
    'SUPERVISOR',
];

// Todas las rutas requieren autenticación
router.use(verificarToken);

// RUTAS
router.get('/mis-asignaciones',
    autorizarRoles(
        ...ROLES_PERSONAL,
    ),
    getMisAsignacionesController,
);

router.patch('/asignaciones/:idProgramacionPersonal/respuesta',
    autorizarRoles(
        ...ROLES_PERSONAL,
    ),
    respondAssignmentController,
);

router.get('/:idProgramacion/personal',
    autorizarRoles(
        ...ROLES_CONSULTA,
    ),
    getProgramacionPersonalController,
);

router.post('/:idProgramacion/personal',
    autorizarRoles(
        ...ROLES_GESTION,
    ),
    addProgramacionPersonalController,
);

router.patch('/:idProgramacion/personal/:idProgramacionPersonal/retirar',
    autorizarRoles(
        ...ROLES_GESTION,
    ),
    removeProgramacionPersonalController,
);

module.exports = router;