const express = require('express');
const router = express.Router();

// Controllers
const {
  resolvePublicQrController,
  getPublicQrInformationController,
  getPublicQrScheduleController,
  getPublicQrRouteStatusController,
  getPublicQrRouteLocationController,
} = require('../controllers');

// Middleware
const { publicQrRateLimit } = require('../middlewares/codigo-qr-rate-limit.middleware');

/*
|--------------------------------------------------------------------------
| Rutas públicas de códigos QR
|--------------------------------------------------------------------------
|
| No utilizan verificarToken ni autorizarRoles.
|
*/

/*
|--------------------------------------------------------------------------
| Información pública consolidada
|--------------------------------------------------------------------------
|
| Devuelve información del recurso asociado al QR, su cronograma y,
| cuando corresponde, el estado operativo de la ruta.
|
*/

router.get('/:tokenPublico/informacion', publicQrRateLimit, getPublicQrInformationController);

/*
|--------------------------------------------------------------------------
| Cronograma público
|--------------------------------------------------------------------------
|
| Disponible para códigos QR asociados tanto a rutas como a zonas.
|
*/

router.get('/:tokenPublico/cronograma', publicQrRateLimit, getPublicQrScheduleController);

/*
|--------------------------------------------------------------------------
| Estado actual de la ruta
|--------------------------------------------------------------------------
|
| Solamente aplica a códigos QR cuyo recurso sea una ruta.
|
*/

router.get('/:tokenPublico/estado', publicQrRateLimit, getPublicQrRouteStatusController);

/*
|--------------------------------------------------------------------------
| Última ubicación pública
|--------------------------------------------------------------------------
|
| Devuelve una ubicación con precisión reducida para no exponer
| información GPS sensible.
|
*/

router.get('/:tokenPublico/ubicacion', publicQrRateLimit, getPublicQrRouteLocationController);

/*
|--------------------------------------------------------------------------
| Resolver código QR
|--------------------------------------------------------------------------
|
| Esta ruta debe permanecer al final para mantener una organización
| clara y evitar futuros conflictos con rutas adicionales.
|
*/

router.get('/:tokenPublico', publicQrRateLimit, resolvePublicQrController);

module.exports = router;