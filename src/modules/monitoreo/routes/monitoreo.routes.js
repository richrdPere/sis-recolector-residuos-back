const express = require('express');

const router = express.Router();

// Controllers
const {
    getOperationalMonitorController,
    getActiveRoutesMapController,
    getRouteMonitorDetailController,
    getOperationalAlertsController,
} = require('../controllers');

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

/*
|--------------------------------------------------------------------------
| Roles autorizados para supervisión operativa
|--------------------------------------------------------------------------
*/
const ROLES_MONITOREO = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

/*
|--------------------------------------------------------------------------
| Autenticación y autorización general
|--------------------------------------------------------------------------
*/
router.use(verificarToken);

router.use(
    autorizarRoles(
        ...ROLES_MONITOREO,
    ),
);

/*
|--------------------------------------------------------------------------
| Rutas de monitoreo
|--------------------------------------------------------------------------
*/

// GET /api/monitoreo/operacion
router.get(
    '/operacion',
    getOperationalMonitorController,
);

// GET /api/monitoreo/mapa
router.get(
    '/mapa',
    getActiveRoutesMapController,
);

// GET /api/monitoreo/alertas
router.get(
    '/alertas',
    getOperationalAlertsController,
);

// GET /api/monitoreo/recorridos/:idRecorrido
router.get(
    '/recorridos/:idRecorrido',
    getRouteMonitorDetailController,
);

module.exports = router;