const express = require('express');
const router = express.Router();

// Controllers
const {
    createProgramacionController,
    getProgramacionesController,
    getProgramacionByIdController,
    updateProgramacionController,
    cancelProgramacionController,
} = require('../controllers/programacion.controller');

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

router.use(verificarToken);

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

// ROUTES
router.post('/',
    autorizarRoles(...ROLES_GESTION),
    createProgramacionController
);

router.get('/',
    autorizarRoles(
        ...ROLES_CONSULTA,
    ),
    getProgramacionesController,
);

router.patch('/:idProgramacion/cancelar',
    autorizarRoles(
        ...ROLES_GESTION,
    ),
    cancelProgramacionController,
);

router.put('/:idProgramacion',
    autorizarRoles(
        ...ROLES_GESTION,
    ),
    updateProgramacionController,
);

router.get('/:idProgramacion',
    autorizarRoles(
        ...ROLES_CONSULTA,
        'CONDUCTOR',
        'RECOLECTOR',
    ),
    getProgramacionByIdController,
);

module.exports = router;