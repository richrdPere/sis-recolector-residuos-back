const express = require('express');
const router = express.Router();

// Controllers
const {
  registerLocationController,
  registerLocationBatchController,
  getLastLocationController,
  getRoutePositionsController,
  getActiveVehicleLocationsController,
} = require('../controllers/tracking.controller');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require(
  '../../../middlewares/auth.middleware',
);

// ===============================================
// Roles
// ===============================================
const ROLES_TRANSMISION = [
  'CONDUCTOR',
];

const ROLES_CONSULTA = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
];

// Todas las rutas requieren autenticación.
router.use(verificarToken);


// ===============================================
// Transmisión desde la aplicación móvil
// ===============================================
router.post('/ubicaciones/lote',
  autorizarRoles(
    ...ROLES_TRANSMISION,
  ),
  registerLocationBatchController,
);

router.post('/ubicaciones',
  autorizarRoles(
    ...ROLES_TRANSMISION,
  ),
  registerLocationController,
);

// ===============================================
// Monitoreo municipal
// ===============================================
router.get('/vehiculos-activos',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  getActiveVehicleLocationsController,
);

router.get('/recorridos/:idRecorrido/ultima-ubicacion',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  getLastLocationController,
);

router.get('/recorridos/:idRecorrido/posiciones',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  getRoutePositionsController,
);

module.exports = router;