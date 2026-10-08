const express = require('express');
const router = express.Router();

// Middleware
const {
    verificarToken,
    autorizarRoles
} = require("../../../middlewares/auth.middleware");

router.use(verificarToken);


// Controllers
const {
    createVehiculoController,
    getVehiculosPaginadoController,
    getVehiculoByIdController,
    updateVehiculoController,
    changeEstadoVehiculoController,
    deleteVehiculoController,
    getLastCodigoVehiculoController,
    getVehiculosSelectorController,
} = require('../controllers/vehiculo.controller');

// ROUTES
/*
|--------------------------------------------------------------------------
| 1. Consultar vehículos
|--------------------------------------------------------------------------
*/
router.get('/paginado',
    autorizarRoles(
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getVehiculosPaginadoController,
);

router.get('/view/:id',
    autorizarRoles(
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
        'CONDUCTOR',
    ),
    getVehiculoByIdController,
);
/*
|--------------------------------------------------------------------------
| 2. Administrar vehículos
|--------------------------------------------------------------------------
*/
router.post('/create', autorizarRoles('ADMIN'), createVehiculoController);
router.put('/update/:id', autorizarRoles('ADMIN'), updateVehiculoController);
router.patch('/estado/:id', autorizarRoles('ADMIN'), changeEstadoVehiculoController);
router.delete('/delete/:id', autorizarRoles('ADMIN'), deleteVehiculoController);
router.get('/codigo', autorizarRoles('ADMIN'), getLastCodigoVehiculoController);
router.get('/selector',
    autorizarRoles(
        'SUPER_ADMIN',
        'ADMIN',
        'SUPERVISOR',
        'OPERADOR',
    ),
    getVehiculosSelectorController,
);

module.exports = router;