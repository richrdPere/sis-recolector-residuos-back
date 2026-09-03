const express = require('express');
const router = express.Router();

// Controllers
const {
    getConductoresDisponiblesController,
    getRecolectoresDisponiblesController,
    getVehiculosDisponiblesController,
} = require(
    '../controllers/disponibilidad.controller',
);

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require(
    '../../../middlewares/auth.middleware',
);

// Roles autorizados
const ROLES_DISPONIBILIDAD = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

// Autenticación y autorización general
router.use(verificarToken);
router.use(
    autorizarRoles(
        ...ROLES_DISPONIBILIDAD,
    ),
);

// ROUTES
router.get('/vehiculos', getVehiculosDisponiblesController);
router.get('/conductores', getConductoresDisponiblesController);
router.get('/recolectores', getRecolectoresDisponiblesController);

module.exports = router;