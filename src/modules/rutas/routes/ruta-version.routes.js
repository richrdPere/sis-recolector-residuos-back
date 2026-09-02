const express = require('express');
const router = express.Router();

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require(
    '../../../middlewares/auth.middleware',
);

router.use(verificarToken);


// Controllers
const {
    createRutaVersionController,
    getRutaVersionesController,
    getRutaVersionVigenteController,
    updateRutaVersionController,
    activarRutaVersionController,
    deleteRutaVersionController,
} = require('../controllers/ruta-version.controller');

// ROUTES

router.post('/:idRuta/versiones',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createRutaVersionController,
);

router.get('/:idRuta/versiones',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutaVersionesController,
);

router.get('/:idRuta/version-vigente',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutaVersionVigenteController,
);

router.put('/versiones/:idVersion',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateRutaVersionController,
);

router.patch('/versiones/:idVersion/activar',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    activarRutaVersionController,
);

router.delete('/versiones/:idVersion',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deleteRutaVersionController,
);

module.exports = router;