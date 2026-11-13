const express = require('express');
const router = express.Router();

// Controllers
const {
    iniciarRecorridoController,
    getRecorridoActivoController,
    getRecorridoByIdController,
    pausarRecorridoController,
    reanudarRecorridoController,
    finalizarRecorridoController,
    cancelarRecorridoController,
    getMisRecorridosController,
} = require('../controllers');

// Middlewares
const {
    verificarToken,
    autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const ROLES_OPERACION = [
    'CONDUCTOR',
];

const ROLES_EQUIPO = [
    'CONDUCTOR',
    'RECOLECTOR',
    'SUPERVISOR',
];

const ROLES_CONSULTA = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
    'OPERADOR',
];

const ROLES_GESTION = [
    'SUPER_ADMIN',
    'ADMIN',
    'SUPERVISOR',
];

const ROLES_DETALLE = [
    ...new Set([
        ...ROLES_CONSULTA,
        ...ROLES_EQUIPO,
    ]),
];

// Autenticación
router.use(verificarToken);

router.use('/historial', require('./historial.routes'),
);

const {
    resultadoFinalService,
    autorizarConsultaRecorrido,
} = require('../services/resultado-final.service');

const {
    getAuthenticatedUserId,
} = require('../utils/controller.utils');

const resultado = guardar => async (req, res, next) => {
    try {
        const data = await resultadoFinalService({
            id_recorrido: req.params.idRecorrido,
            id_usuario: getAuthenticatedUserId(req),
            payload: guardar ? req.body : null,
        });

        return res.json({
            success: true,
            message: guardar
                ? 'Resultado confirmado.'
                : 'Resultado consultado.',
            data,
        });
    } catch (error) {
        next(error);
    }
};

router.get('/:idRecorrido/resultado-final',
    autorizarRoles('CONDUCTOR', 'RECOLECTOR'),
    resultado(false),
);

router.post('/:idRecorrido/resultado-final',
    autorizarRoles('CONDUCTOR', 'RECOLECTOR'),
    resultado(true),
);


// ROUTES - MOVILES
router.post('/iniciar/:idProgramacion',
    autorizarRoles(...ROLES_OPERACION),
    iniciarRecorridoController,
);

router.patch('/pausar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    pausarRecorridoController,
);

router.patch('/reanudar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    reanudarRecorridoController,
);

router.patch('/finalizar/:idRecorrido',
    autorizarRoles(...ROLES_OPERACION),
    finalizarRecorridoController,
);

router.get('/mis-recorridos',
    autorizarRoles('CONDUCTOR', 'RECOLECTOR'),
    getMisRecorridosController,
);

// ROUTES - ADMIN
router.patch('/cancelar/:idRecorrido',
    autorizarRoles(...ROLES_GESTION),
    cancelarRecorridoController,
);

// ROUTES - MOVIL Y ADMIN
router.get('/activo',
    autorizarRoles(...ROLES_EQUIPO),
    getRecorridoActivoController,
);

router.get('/view/:idRecorrido',
    autorizarRoles(...ROLES_DETALLE),
    autorizarConsultaRecorrido,
    getRecorridoByIdController,
);

module.exports = router;