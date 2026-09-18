const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/routes/auth.routes");
const vehiculoRoutes = require("../modules/vehiculos/routes/vehiculo.routes");
const personalRoutes = require('../modules/personal/routes');
const rutasRoutes = require("../modules/rutas/routes");
const zonasRoutes = require("../modules/zonas/routes/zona.routes");
const programacionRoutes = require('../modules/programaciones/routes');
const recorridoRoutes = require('../modules/recorridos/routes');
const trackingRoutes = require("../modules/tracking/routes/tracking.routes");
const recoleccionRoutes = require('../modules/recolecciones/routes/recoleccion.routes');
const notificationRoutes = require('../modules/notificaciones/routes');
const ciudadanoRoutes = require('../modules/ciudadanos/routes/ciudadanos.routes');
const codigoQrRoutes = require('../modules/codigos-qr/routes/codigo-qr.routes');
const codigoQrPublicRoutes = require('../modules/codigos-qr/routes/codigo-qr-public.routes');
const monitoreoRoutes = require("../modules/monitoreo/routes/monitoreo.routes");
const dashboardRoutes = require('../modules/monitoreo/routes/dashboard.routes');

// Rutas
router.use("/auth", authRoutes); // COMPLETE
router.use("/vehiculos", vehiculoRoutes); // COMPLETE
router.use('/personal', personalRoutes); // COMPLETE
router.use('/rutas', rutasRoutes); // COMPLETE
router.use('/zonas', zonasRoutes); // COMPLETE
router.use('/programaciones', programacionRoutes); // COMPLETE
router.use('/recorridos', recorridoRoutes); // COMPLETE
router.use('/tracking', trackingRoutes);
router.use('/recolecciones', recoleccionRoutes); // FALTA
router.use('/notificaciones', notificationRoutes);
router.use('/ciudadanos', ciudadanoRoutes);
router.use('/codigos-qr', codigoQrRoutes);
router.use('/publico/qr', codigoQrPublicRoutes);
router.use('/monitoreo', monitoreoRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;