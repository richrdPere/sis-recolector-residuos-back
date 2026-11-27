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

const {
  getMapaPublicoController
} = require("../controllers/get-mapa-publico.controller");

// Dispositivos
const { dispositivo: gestionarDispositivoWeb } = require('../services/alertas-web.service');

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
router.get('/mapa', getMapaPublicoController);

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

// Alertas web
router.post('/alertas/dispositivo',
  async (req, res, next) => {
    try {
      const data = await gestionarDispositivoWeb(req.body);

      return res.json({
        success: true,
        message: 'Navegador vinculado.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post('/alertas/baja',
  async (req, res, next) => {
    try {
      const data = await gestionarDispositivoWeb(
        req.body,
        true,
      );

      return res.json({
        success: true,
        message: 'Avisos desactivados.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);


module.exports = router;