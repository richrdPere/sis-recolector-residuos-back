const express = require('express');

const rutaRoutes = require('./ruta.routes');
const rutaVersionRoutes = require('./ruta-version.routes');
const rutaPuntoRoutes = require('./ruta-punto.routes');
const rutaHorarioRoutes = require('./ruta-horario.routes');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Rutas principales
|--------------------------------------------------------------------------
*/
router.use('/', rutaRoutes);
/*
|--------------------------------------------------------------------------
| Versiones
|--------------------------------------------------------------------------
*/
router.use('/', rutaVersionRoutes);
/*
|--------------------------------------------------------------------------
| Puntos
|--------------------------------------------------------------------------
*/
router.use('/', rutaPuntoRoutes);
/*
|--------------------------------------------------------------------------
| Horarios
|--------------------------------------------------------------------------
*/
router.use('/', rutaHorarioRoutes);

module.exports = router;