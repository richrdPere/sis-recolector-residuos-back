const express = require('express');
const router = express.Router();

const recorridoEventoRoutes = require('./recorrido-evento.routes');
const recorridoRoutes = require('./recorrido.routes');

router.use('/', recorridoEventoRoutes);
router.use('/', recorridoRoutes);

module.exports = router;