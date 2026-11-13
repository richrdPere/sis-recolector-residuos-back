const express = require('express');

const { rateLimit } = require('express-rate-limit');

const router = express.Router();

// Controllers
const {
  getZonasPublicasController,
  getRutasPublicasPorZonaController,
  getInformacionRutaPublicaController,
} = require('../controllers/publico.controller');

const {
  getConfiguracionAlertasController,
  registrarAlertaPublicaController,
} = require('../controllers/alerta-publica.controller');

// ==========================================================
// MIDDLEWARES
// ==========================================================
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    handler: (_req, res) => {
      return res.status(429).json({
        success: false,
        message:
          'Demasiadas consultas. Inténtalo nuevamente en un minuto.',
      });
    },
  }),
);

// ==========================================================
// RUTAS PÚBLICAS
// ==========================================================
router.get(
  '/zonas',
  getZonasPublicasController,
);

router.get(
  '/zonas/:idZona/rutas',
  getRutasPublicasPorZonaController,
);

router.get(
  '/rutas/:idRuta/informacion',
  getInformacionRutaPublicaController,
);


router.get(
  '/alertas/configuracion',
  getConfiguracionAlertasController,
);

router.post(
  '/alertas/registro',

  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,

    standardHeaders: 'draft-8',
    legacyHeaders: false,

    handler: (_req, res) => {
      return res.status(429).json({
        success: false,

        message:
          'Se alcanzó el límite de intentos. ' +
          'Inténtalo nuevamente más tarde.',
      });
    },
  }),

  registrarAlertaPublicaController,
);

module.exports = router;