const express = require('express');
const router = express.Router();

// Controllers
const {
    createRutaHorarioController,
    getRutaHorariosController,
    updateRutaHorarioController,
    changeRutaHorarioEstadoController,
    deleteRutaHorarioController,
} = require('../controllers/ruta-horario.controller');

// MIddlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

router.use(verificarToken);


// ROUTES
router.post('/:idRuta/horarios',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    createRutaHorarioController,
);

router.get('/:idRuta/horarios',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getRutaHorariosController,
);

router.put('/:idRuta/horarios/:idHorario',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    updateRutaHorarioController,
);

router.patch('/:idRuta/horarios/:idHorario/estado',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    changeRutaHorarioEstadoController,
);

router.delete('/:idRuta/horarios/:idHorario',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
    ),
    deleteRutaHorarioController,
);

module.exports = router;