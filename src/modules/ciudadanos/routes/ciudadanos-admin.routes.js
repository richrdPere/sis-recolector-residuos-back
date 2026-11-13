const express = require('express');
const router = express.Router();

const { autorizarRoles } = require('../../../middlewares/auth.middleware');

const { getCitizensPaginatedController } = require('../controllers/ciudadano-admin.controller');

// La autenticación se ejecuta en el router padre.
router.use(
  autorizarRoles(
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
  ),
);

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/paginado', getCitizensPaginatedController);

module.exports = router;