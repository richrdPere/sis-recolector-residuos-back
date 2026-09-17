const express = require('express');
const router = express.Router();

// Controllers
const {
    iniciarRecorridoController,
    getRecorridoActivoController,
    getRecorridoByIdController,
    pausarRecorridoController,
    reanudarRecorridoController,
    finalizarRecorridoController,
    cancelarRecorridoController,
    getMisRecorridosController,
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

const ROLES_DETALLE = [
    ...new Set([
        ...ROLES_CONSULTA,
        ...ROLES_EQUIPO,
    ]),
];

// Autenticación
router.use(verificarToken);

// ROUTES - MOVILES
router.post('/iniciar/:idProgramacion',
    autorizarRoles(...ROLES_OPERACION),
    iniciarRecorridoController,
);

router.patch('/pausar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    pausarRecorridoController,
);

router.patch('/reanudar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    reanudarRecorridoController,
);

router.patch('/finalizar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    finalizarRecorridoController,
);

router.get('/mis-recorridos',
    autorizarRoles(...ROLES_OPERACION),
    getMisRecorridosController,
);

// ROUTES - ADMIN
router.patch('/cancelar/:idRecorrido',
    autorizarRoles(...ROLES_GESTION),
    cancelarRecorridoController,
);

// ROUTES - MOVIL Y ADMIN
router.get('/activo',
    autorizarRoles(...ROLES_EQUIPO),
    getRecorridoActivoController,
);

router.get('/view/:idRecorrido',
    autorizarRoles(...ROLES_DETALLE),
    getRecorridoByIdController,
);

module.exports = router;