const express = require('express');
const router = express.Router();

// Middleware
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

router.use(verificarToken);

// Controllers
const {
    createZonaController,
    getZonasPaginatedController,
    getZonasActivasController,
    getZonaByIdController,
    updateZonaController,
    changeZonaEstadoController,
    deleteZonaController,
} = require('../controllers/zona.controller');

// ROUTES

// - Consultas
router.get('/paginado',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getZonasPaginatedController,
);

router.get('/activas',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getZonasActivasController,
);

router.get('/view/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getZonaByIdController,
);

// - Administración
router.post(
    '/create',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createZonaController,
);

router.put(
    '/update/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateZonaController,
);

router.patch(
    '/estado/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changeZonaEstadoController,
);

router.delete(
    '/delete/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deleteZonaController,
);

module.exports = router;