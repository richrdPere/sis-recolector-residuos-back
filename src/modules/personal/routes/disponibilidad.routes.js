const express = require('express');
const router = express.Router();

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

router.use(verificarToken);


// Controllers
const {
    getConductoresDisponiblesController,
    getRecolectoresDisponiblesController,
    getPersonalByRolController,
} = require('../controllers/disponibilidad.controller');

// ROUTES
router.get('/conductores/disponibles',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getConductoresDisponiblesController,
);

router.get('/recolectores/disponibles',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRecolectoresDisponiblesController,
);

router.get('/rol/:rol',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getPersonalByRolController,
);

module.exports = router;