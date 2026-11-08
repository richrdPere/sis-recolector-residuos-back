const express = require('express');
const router = express.Router();

// Controllers
const {
  getAuditoriaPaginadoController,
  getAuditoriaByIdController,
  getAuditoriaByEntidadController,
} = require('../controllers/auditoria.controller');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// *********************************************************
// RESPUESTAS SIN CACHÉ
// *********************************************************

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

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
];

router.use(
  autorizarRoles(...ROLES_CONSULTA),
);

// El service aplica además las restricciones del supervisor.

// *********************************************************
// CONSULTAS
// *********************************************************
router.get('/paginado', getAuditoriaPaginadoController);
router.get('/entidad/:tipoEntidad/:idEntidad', getAuditoriaByEntidadController);
router.get('/view/:id', getAuditoriaByIdController);

module.exports = router;