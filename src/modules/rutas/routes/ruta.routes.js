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
    createRutaController,
    getRutasPaginatedController,
    getRutasActivasController,
    getRutasByZonaController,
    getRutaByIdController,
    updateRutaController,
    changeRutaEstadoRutaController,
    changeRutaEstadoController,
    deleteRutaController,
} = require('../controllers/ruta.controller');

// ROUTES

// - Consultas
router.get('/paginado',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutasPaginatedController,
);

router.get('/activas',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutasActivasController,
);

router.get('/zona/:idZona',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutasByZonaController,
);

router.get('/view/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutaByIdController,
);


// - Administración
router.post('/create',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createRutaController,
);

router.put('/update/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateRutaController,
);

router.patch('/estado-ruta/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changeRutaEstadoRutaController,
);

router.patch('/estado/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changeRutaEstadoController,
);

router.delete(
    '/delete/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deleteRutaController,
);

module.exports = router;