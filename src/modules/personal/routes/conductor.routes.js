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
    createConductorController,
    getConductorByIdController,
    updateConductorController,
    changeConductorEstadoController,
} = require(    '../controllers/conductor.controller');


// ROUTES
router.post(
    '/:idPersonal/conductor',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createConductorController,
);

router.get(
    '/:idPersonal/conductor',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getConductorByIdController,
);

router.put(
    '/:idPersonal/conductor',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateConductorController,
);

router.patch(
    '/:idPersonal/conductor/estado',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changeConductorEstadoController,
);

module.exports = router;