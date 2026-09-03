const express = require('express');
const router = express.Router();

// Controllers
const {
    getRecorridoActivoController,
    getRecorridoByIdController,
    pausarRecorridoController,
    reanudarRecorridoController,
    finalizarRecorridoController,
    cancelarRecorridoController,
} = require(
    '../controllers',
);

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const ROLES_OPERACION = [
    'CONDUCTOR',
];

const ROLES_EQUIPO = [
    'CONDUCTOR',
    'RECOLECTOR',
    'SUPERVISOR',
];

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

// Autenticación
router.use(verificarToken);

// ROUTES

router.get('/activo',
    autorizarRoles(
        ...ROLES_EQUIPO,
    ),
    getRecorridoActivoController,
);

router.patch('/:idRecorrido/pausar',
    autorizarRoles(
        ...ROLES_OPERACION,
    ),
    pausarRecorridoController,
);

router.patch('/:idRecorrido/reanudar',
    autorizarRoles(
        ...ROLES_OPERACION,
    ),
    reanudarRecorridoController,
);

router.patch('/:idRecorrido/finalizar',
    autorizarRoles(
        ...ROLES_OPERACION,
    ),
    finalizarRecorridoController,
);

router.patch('/:idRecorrido/cancelar',
    autorizarRoles(
        ...ROLES_GESTION,
    ),
    cancelarRecorridoController,
);

router.get('/:idRecorrido',
    autorizarRoles(
        ...ROLES_CONSULTA,
    ),
    getRecorridoByIdController,
);

module.exports = router;