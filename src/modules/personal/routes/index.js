const express = require('express',);

const personalRoutes = require('./personal.routes');
const conductorRoutes = require('./conductor.routes');
const disponibilidadRoutes = require('./disponibilidad.routes');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Rutas del módulo personal
|--------------------------------------------------------------------------
*/

router.use('/', disponibilidadRoutes);
router.use('/', personalRoutes);
router.use('/', conductorRoutes);

module.exports = router;