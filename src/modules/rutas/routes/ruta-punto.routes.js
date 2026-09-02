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


// Controller
const {
    createRutaPuntoController,
    updateRutaPuntoController,
    reorderRutaPuntosController,
    deleteRutaPuntoController,
} = require('../controllers/ruta-punto.controller');


router.post('/versiones/:idVersion/puntos',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createRutaPuntoController,
);

router.put('/versiones/:idVersion/puntos/orden',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    reorderRutaPuntosController,
);

router.put('/versiones/:idVersion/puntos/:idPunto',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateRutaPuntoController,
);

router.delete('/versiones/:idVersion/puntos/:idPunto',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deleteRutaPuntoController,
);

module.exports = router;