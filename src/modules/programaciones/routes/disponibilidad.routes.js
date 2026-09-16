const express = require('express');

const router = express.Router();

// Controllers
const {
    getConductoresDisponiblesController,
    getRecolectoresDisponiblesController,
    getVehiculosDisponiblesController,
} = require('../controllers/disponibilidad.controller');

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const {
    ROLES_CONSULTA_ADMIN,
} = require('../validations/programacion.roles');

// *********************************************************
// WEB - AUTENTICACIÓN Y AUTORIZACIÓN
// *********************************************************
router.use(verificarToken);
router.use(autorizarRoles(...ROLES_CONSULTA_ADMIN));

// *********************************************************
// DISPONIBILIDAD PARA PLANIFICACIÓN
// *********************************************************
router.get(
    '/vehiculos',
    getVehiculosDisponiblesController,
);

router.get(
    '/conductores',
    getConductoresDisponiblesController,
);

router.get(
    '/recolectores',
    getRecolectoresDisponiblesController,
);

module.exports = router;