const express = require('express');
const router = express.Router();

// Controllers
const {
  getHistorialListadoController,
  getHistorialDetalleController,
  getHistorialTrazadoController,
} = require('../controllers');

// Middlewares
const { autorizarRoles } = require('../../../middlewares/auth.middleware');

// ==========================================================
// ROLES
// ==========================================================

// Acceso al listado administrativo.
const ROLES_LISTADO = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// Acceso al detalle y trazado.
// Los services validan qué recorridos puede consultar cada usuario.
const ROLES_DETALLE = [
  ...new Set([
    ...ROLES_LISTADO,
    'OPERADOR',
    'CONDUCTOR',
    'RECOLECTOR',
  ]),
];

// ==========================================================
// AUTORIZACIÓN GENERAL
// El router padre ya ejecuta verificarToken.
// ==========================================================
router.use(
  autorizarRoles(...ROLES_DETALLE),
);

// ==========================================================
// CACHÉ
// Aplicar también a respuestas de error de las consultas.
// ==========================================================
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ==========================================================
// LISTADO
// ==========================================================
router.get('/', autorizarRoles(...ROLES_LISTADO), getHistorialListadoController);

// ==========================================================
// TRAZADO GPS
// ==========================================================
router.get('/:idRecorrido/trazado', getHistorialTrazadoController);

// ==========================================================
// DETALLE
// ==========================================================
router.get('/:idRecorrido', getHistorialDetalleController);

module.exports = router;