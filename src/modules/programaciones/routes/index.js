const express = require('express');
const router = express.Router();

const disponibilidadRoutes = require('./disponibilidad.routes');
const programacionPersonalRoutes = require('./programacion-personal.routes');
const programacionRoutes = require('./programacion.routes');

/*
|--------------------------------------------------------------------------
| 1. Disponibilidad
|--------------------------------------------------------------------------
*/

router.use('/disponibilidad', disponibilidadRoutes);

/*
|--------------------------------------------------------------------------
| 2. Personal asignado
|--------------------------------------------------------------------------
*/

router.use('/', programacionPersonalRoutes);

/*
|--------------------------------------------------------------------------
| 3. CRUD de programaciones
|--------------------------------------------------------------------------
|
| Se coloca al final porque contiene /:idProgramacion.
|
*/
router.use('/', programacionRoutes);



module.exports = router;