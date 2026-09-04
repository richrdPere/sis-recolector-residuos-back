const express = require('express');
const router = express.Router();

// Controllers
const {
    getRecorridoEventosController,
} = require('../controllers');

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const ROLES_CONSULTA = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

// Authentication
router.use(verificarToken);

// Routes
router.get('/:idRecorrido/eventos',
    autorizarRoles(
        ...ROLES_CONSULTA,
    ),
    getRecorridoEventosController,
);

module.exports = router;