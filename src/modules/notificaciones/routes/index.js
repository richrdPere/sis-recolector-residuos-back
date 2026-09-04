const express = require('express');
const router = express.Router();

const deviceRoutes = require('./dispositivo.routes');
const notificacionesRoutes = require('./notificacion.routes');

router.use('/dispositivos', deviceRoutes);
router.use('/', notificacionesRoutes);


module.exports = router;