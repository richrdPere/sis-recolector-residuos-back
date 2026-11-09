const express = require('express');
const router = express.Router();

const { autorizarRoles } = require('../../../middlewares/auth.middleware');

const {
  ejecutar,
} = require(
  '../../reportes/services/reporte-base.service',
);

const {
  detalleHistorialService,
  trazadoHistorialService,
} = require(
  '../services/historial-recorrido.service',
);

// El router padre ya ejecuta verificarToken.
router.use(
  autorizarRoles(
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
    'CONDUCTOR',
    'RECOLECTOR',
  ),
);

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const responder = service => async (req, res, next) => {
  try {
    const data = await service(
      req.params.idRecorrido,
      req.usuario,
    );

    return res.json({
      success: true,
      message: 'Historial consultado.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// Listado administrativo: reutiliza filtros y paginación
// del reporte de recorridos que ya actualizamos.
router.get(
  '/',
  autorizarRoles(
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
  ),
  async (req, res, next) => {
    try {
      const data = await ejecutar(
        'RECORRIDOS',
        {
          query: req.query,
          usuario: req.usuario,
        },
      );

      return res.json({
        success: true,
        message: 'Recorridos consultados.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/:idRecorrido/trazado', responder(trazadoHistorialService));

router.get('/:idRecorrido', responder(detalleHistorialService));

module.exports = router;