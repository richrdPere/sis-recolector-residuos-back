const express = require("express");
const router = express.Router();

// Middleware - Auditoria
const { contextoAuditoriaMiddleware } = require('../modules/auditoria/utils/auditoria-contexto.utils');

// Rutas principales
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
const usuarioRoutes = require('../modules/usuarios/routes/usuario.routes');
const mantenimientosRoutes = require('../modules/mantenimientos/routes/mantenimientos.routes');
const incidenciasRoutes = require("../modules/incidencias/routes/incidencias.routes");
const reportesRoutes = require("../modules/reportes/routes/reporte.routes");
const auditoriaRoutes = require('../modules/auditoria/routes/auditoria.routes');
const publicoRoutes = require("../modules/publico/routes/publico.routes");

// Rutas
router.use("/auth", authRoutes); // COMPLETE 

router.use(contextoAuditoriaMiddleware);

router.use("/vehiculos", vehiculoRoutes); // COMPLETE 
router.use('/personal', personalRoutes); // COMPLETE 
router.use('/rutas', rutasRoutes); // COMPLETE
router.use('/zonas', zonasRoutes); // COMPLETE
router.use('/programaciones', programacionRoutes); // COMPLETE
router.use('/recorridos', recorridoRoutes); // COMPLETE
router.use('/tracking', trackingRoutes); // COMPLETE
router.use('/recolecciones', recoleccionRoutes); // COMPLETE
router.use('/notificaciones', notificationRoutes); // COMPLETE
router.use('/ciudadanos', ciudadanoRoutes); // COMPLETE
router.use('/codigos-qr', codigoQrRoutes); // COMPLETE
router.use('/publico/qr', codigoQrPublicRoutes); // COMPLETE
router.use('/monitoreo', monitoreoRoutes); // COMPLETE
router.use('/dashboard', dashboardRoutes); // COMPLETE
router.use('/usuarios', usuarioRoutes); // COMPLETE
router.use("/mantenimientos", mantenimientosRoutes); // COMPLETE
router.use('/incidencias', incidenciasRoutes); // COMPLETE
router.use('/reportes', reportesRoutes); // COMPLETE
router.use('/auditoria', auditoriaRoutes); // COMPLETE
router.use('/publico', publicoRoutes);

module.exports = router;

// Para las IP detrás de un proxy, configura trust proxy según tu despliegue. No extraigas directamente x-forwarded-for.