const express = require('express');
const router = express.Router();

// CONTROLLERS
const {
  createMantenimientoController,
  getMantenimientosPaginatedController,
  getMantenimientoByIdController,
  updateMantenimientoController,
  iniciarMantenimientoController,
  finalizarMantenimientoController,
  cancelarMantenimientoController,
  getMantenimientosByVehiculoController,
  getMantenimientosProximosController,
} = require('../controllers/mantenimientos.controller');

// MIDDLEWARES
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// *********************************************************
// AUTENTICACIÓN
// *********************************************************
router.use(verificarToken);

// *********************************************************
// ROLES AUTORIZADOS
// *********************************************************
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

// *********************************************************
// CONSULTAS
// *********************************************************
router.get('/paginado',
  autorizarRoles(...ROLES_CONSULTA),
  getMantenimientosPaginatedController,
);

router.get('/proximos',
  autorizarRoles(...ROLES_CONSULTA),
  getMantenimientosProximosController,
);

router.get('/vehiculo/:idVehiculo',
  autorizarRoles(...ROLES_CONSULTA),
  getMantenimientosByVehiculoController,
);

router.get('/view/:id',
  autorizarRoles(...ROLES_CONSULTA),
  getMantenimientoByIdController,
);

// *********************************************************
// GESTIÓN
// *********************************************************
router.post('/create',
  autorizarRoles(...ROLES_GESTION),
  createMantenimientoController,
);

router.put('/update/:id',
  autorizarRoles(...ROLES_GESTION),
  updateMantenimientoController,
);

router.patch('/:id/iniciar',
  autorizarRoles(...ROLES_GESTION),
  iniciarMantenimientoController,
);

router.patch('/:id/finalizar',
  autorizarRoles(...ROLES_GESTION),
  finalizarMantenimientoController,
);

router.patch('/:id/cancelar',
  autorizarRoles(...ROLES_GESTION),
  cancelarMantenimientoController,
);

module.exports = router;