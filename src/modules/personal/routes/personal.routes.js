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
    createPersonalController,
    getPersonalPaginatedController,
    getPersonalByIdController,
    updatePersonalController,
    changePersonalEstadoController,
    deletePersonalController,
} = require('../controllers/personal.controller');

// ROUTES
router.get('/paginado',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getPersonalPaginatedController,
);

router.get('/view/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getPersonalByIdController,
);

router.post('/create',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createPersonalController,
);

router.put('/update/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updatePersonalController,
);

router.patch('/estado/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changePersonalEstadoController,
);

router.delete('/delete/:id',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deletePersonalController,
);

module.exports = router;

