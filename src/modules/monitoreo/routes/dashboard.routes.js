const express = require('express');

const router = express.Router();

// Controllers
const {
  getDashboardSummaryController,
  getProgrammingIndicatorsController,
  getCollectionIndicatorsController,
  getVehicleIndicatorsController,
  getRoutePerformanceController,
  getDashboardTrendsController,
} = require('../controllers');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

/*
|--------------------------------------------------------------------------
| Roles autorizados para consultar indicadores administrativos
|--------------------------------------------------------------------------
*/
const ROLES_DASHBOARD = [
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
    ...ROLES_DASHBOARD,
  ),
);

/*
|--------------------------------------------------------------------------
| Rutas del dashboard
|--------------------------------------------------------------------------
*/

// GET /api/dashboard/resumen
router.get(
  '/resumen',
  getDashboardSummaryController,
);

// GET /api/dashboard/programaciones
router.get(
  '/programaciones',
  getProgrammingIndicatorsController,
);

// GET /api/dashboard/recolecciones
router.get(
  '/recolecciones',
  getCollectionIndicatorsController,
);

// GET /api/dashboard/vehiculos
router.get(
  '/vehiculos',
  getVehicleIndicatorsController,
);

// GET /api/dashboard/rendimiento-rutas
router.get(
  '/rendimiento-rutas',
  getRoutePerformanceController,
);

// GET /api/dashboard/tendencias
router.get(
  '/tendencias',
  getDashboardTrendsController,
);

module.exports = router;