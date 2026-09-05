// routes/ciudadano.routes.js

const express = require('express');
const router = express.Router();

// Controllers
const {
  createCitizenProfileController,
  getMyCitizenProfileController,
  updateCitizenProfileController,

  getMyAddressesController,
  createCitizenAddressController,
  updateCitizenAddressController,
  setPrimaryAddressController,
  deleteCitizenAddressController,
  getScheduleByAddressController,

  getNotificationPreferencesController,
  updateNotificationPreferencesController,
} = require('../controllers');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// ==========================================================
// Roles
// ==========================================================
const ROLES_CIUDADANO = [
  'CIUDADANO',
];

// Todas las rutas requieren autenticación
router.use(verificarToken);
router.use(autorizarRoles(...ROLES_CIUDADANO),
);

// ==========================================================
// Perfil ciudadano
// ==========================================================
router.post('/perfil', createCitizenProfileController);
router.get('/me', getMyCitizenProfileController);
router.put('/me', updateCitizenProfileController);

// ==========================================================
// Preferencias de notificación
// ==========================================================
//
// Las rutas estáticas deben declararse antes de posibles
// parámetros dinámicos generales.
//
router.get('/preferencias-notificacion', getNotificationPreferencesController);
router.put('/preferencias-notificacion', updateNotificationPreferencesController);

// ==========================================================
// Domicilios
// ==========================================================
router.get('/domicilios', getMyAddressesController);
router.post('/domicilios', createCitizenAddressController);
router.patch('/domicilios/:idDomicilio/principal', setPrimaryAddressController);
router.put('/domicilios/:idDomicilio', updateCitizenAddressController);
router.delete('/domicilios/:idDomicilio', deleteCitizenAddressController);
router.get('/domicilios/:idDomicilio/cronograma', getScheduleByAddressController);

module.exports = router;