const express = require('express');
const router = express.Router();

// Controllers
const {
  createQrCodeController,
  getQrCodesController,
  getQrCodeByIdController,
  changeQrCodeStatusController,
  regenerateQrCodeController,
  generateQrImageController,
} = require('../controllers');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');


// ==========================================================
// Roles
// ==========================================================
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

// Todas las rutas administrativas requieren autenticación.
router.use(verificarToken);

// ==========================================================
// Listado y creación
// ==========================================================
router.post('/',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  createQrCodeController,
);

router.get('/',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  getQrCodesController,
);

// ==========================================================
// Imagen QR
// ==========================================================
//
// Esta ruta debe declararse antes del detalle general.
//

router.get(
  '/:idCodigoQr/imagen',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  generateQrImageController,
);

// ==========================================================
// Cambios administrativos
// ==========================================================

router.patch(
  '/:idCodigoQr/estado',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  changeQrCodeStatusController,
);

router.patch(
  '/:idCodigoQr/regenerar',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  regenerateQrCodeController,
);

// ==========================================================
// Detalle
// ==========================================================

router.get(
  '/:idCodigoQr',
  autorizarRoles(
    ...ROLES_CONSULTA,
  ),
  getQrCodeByIdController,
);

module.exports = router;