const express = require('express');
const router = express.Router();

// *********************************************************
// MIDDLEWARES
// *********************************************************
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

const {
  validarVehiculoParaFoto,
  uploadVehiculoFoto,
} = require('../../../middlewares/vehiculo-foto-upload.middleware');

// *********************************************************
// CONTROLLERS
// *********************************************************
const {
  createVehiculoController,
  getVehiculosPaginadoController,
  getVehiculoByIdController,
  updateVehiculoController,
  changeEstadoVehiculoController,
  changeEstadoOperativoVehiculoController,
  deleteVehiculoController,
  getLastCodigoVehiculoController,
  getVehiculosSelectorController,
  subirFotoVehiculoController,
  eliminarFotoVehiculoController,
} = require('../controllers/vehiculo.controller');

// *********************************************************
// POLÍTICA DE ROLES DEL MÓDULO
// *********************************************************
const ROLES_GESTION = [
  'SUPER_ADMIN',
  'ADMIN',
];

const ROLES_CONSULTA = [
  ...ROLES_GESTION,
  'SUPERVISOR',
  'OPERADOR',
];

const ROLES_DETALLE = [
  ...ROLES_CONSULTA,
  'CONDUCTOR',
];

// *********************************************************
// AUTENTICACIÓN
// *********************************************************
router.use(verificarToken);

// *********************************************************
// CONSULTAS
// *********************************************************
router.get('/paginado',
  autorizarRoles(...ROLES_CONSULTA),
  getVehiculosPaginadoController,
);

router.get('/selector',
  autorizarRoles(...ROLES_CONSULTA),
  getVehiculosSelectorController,
);

router.get('/codigo',
  autorizarRoles(...ROLES_GESTION),
  getLastCodigoVehiculoController,
);

router.get('/view/:id',
  autorizarRoles(...ROLES_DETALLE),
  getVehiculoByIdController,
);

// *********************************************************
// CREACIÓN Y EDICIÓN
// *********************************************************
router.post('/create',
  autorizarRoles(...ROLES_GESTION),
  createVehiculoController,
);

router.put('/update/:id',
  autorizarRoles(...ROLES_GESTION),
  updateVehiculoController,
);

// *********************************************************
// ESTADO ADMINISTRATIVO
// *********************************************************
router.patch('/estado/:id',
  autorizarRoles(...ROLES_GESTION),
  changeEstadoVehiculoController,
);

// *********************************************************
// ESTADO OPERATIVO
// *********************************************************
router.patch('/:id/estado-operativo',
  autorizarRoles(...ROLES_GESTION),
  changeEstadoOperativoVehiculoController,
);

// *********************************************************
// FOTOGRAFÍAS
// *********************************************************
router.post('/:id/foto',
  autorizarRoles(...ROLES_GESTION),
  validarVehiculoParaFoto,
  uploadVehiculoFoto,
  subirFotoVehiculoController,
);
router.delete(
  '/:id/foto',
  autorizarRoles(...ROLES_GESTION),
  eliminarFotoVehiculoController,
);

// *********************************************************
// ELIMINACIÓN
// *********************************************************
router.delete('/delete/:id',
  autorizarRoles(...ROLES_GESTION),
  deleteVehiculoController,
);

module.exports = router;