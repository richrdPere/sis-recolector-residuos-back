const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/routes/auth.routes");
const vehiculoRoutes = require("../modules/vehiculos/routes/vehiculo.routes");
const personalRoutes = require('../modules/personal/routes');
const rutasRoutes = require("../modules/rutas/routes");
const programacionRoutes = require('../modules/programaciones/routes');
const recorridoRoutes = require('../modules/recorridos/routes');
const trackingRoutes = require("../modules/tracking/routes/tracking.routes");
const recoleccionRoutes = require('../modules/recolecciones/routes/recoleccion.routes');
const notificationRoutes = require('../modules/notificaciones/routes');
const ciudadanoRoutes = require('../modules/ciudadanos/routes/ciudadanos.routes');

// Rutas
router.use("/auth", authRoutes);
router.use("/vehiculos", vehiculoRoutes);
router.use('/personal', personalRoutes);
router.use('/rutas', rutasRoutes);
router.use('/programaciones', programacionRoutes);
router.use('/recorridos', recorridoRoutes);
router.use('/tracking', trackingRoutes);
router.use('/recolecciones', recoleccionRoutes);
router.use('/notificaciones', notificationRoutes);
router.use('/ciudadanos', ciudadanoRoutes);

module.exports = router;