const express = require('express');
const router = express.Router();

// Controllers
const {
    registerDeviceController,
    getMyDevicesController,
    deactivateDeviceController,
    deactivateDeviceByTokenController,
} = require('../controllers/dispositivo.controller');

// Middlewares
const { verificarToken } = require('../../../middlewares/auth.middleware');

// Todas las operaciones requieren autenticación.
router.use(verificarToken);

// =======================================================
// Registrar o renovar token FCM
// =======================================================
router.post('/', registerDeviceController);

// =======================================================
// Consultar dispositivos propios
// =======================================================
router.get('/mis-dispositivos', getMyDevicesController);

// =======================================================
// Desactivar el token actual
// =======================================================
//
// Debe declararse antes de /:idDispositivo/desactivar.
//
router.patch('/token/desactivar', deactivateDeviceByTokenController);

// =======================================================
// Desactivar dispositivo por ID
// =======================================================
router.patch('/:idDispositivo/desactivar', deactivateDeviceController);

module.exports = router;