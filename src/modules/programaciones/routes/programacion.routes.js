const express = require('express');

const router = express.Router();

// Controllers
const {
    createProgramacionController,
    getProgramacionesPaginatedController,
    getProgramacionByIdController,
    updateProgramacionController,
    cancelProgramacionController,
} = require('../controllers/programacion.controller');

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const {
    ROLES_CONSULTA_ADMIN,
    ROLES_GESTION,
    ROLES_CONSULTA_DETALLE,
} = require('../validations/programacion.roles');

// Autenticación
router.use(verificarToken);

// *********************************************************
// WEB - CONSULTA GENERAL
// *********************************************************
router.get('/paginado',
    autorizarRoles(...ROLES_CONSULTA_ADMIN),
    getProgramacionesPaginatedController,
);

// *********************************************************
// WEB - GESTIÓN
// *********************************************************
router.post('/create',
    autorizarRoles(...ROLES_GESTION),
    createProgramacionController,
);

router.put('/editar/:idProgramacion',
    autorizarRoles(...ROLES_GESTION),
    updateProgramacionController,
);

router.patch('/:idProgramacion/cancelar',
    autorizarRoles(...ROLES_GESTION),
    cancelProgramacionController,
);

// *********************************************************
// WEB Y MÓVIL - DETALLE
// *********************************************************
// El service debe verificar la asignación cuando el usuario
// no tenga un rol de consulta administrativa.
router.get('/view/:idProgramacion',
    autorizarRoles(...ROLES_CONSULTA_DETALLE),
    getProgramacionByIdController,
);

module.exports = router;