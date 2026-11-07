const express = require('express');
const router = express.Router();

// CONTROLLERS
const {
  getReporteProgramacionesController,
  getReporteRecorridosController,
  getReporteRecoleccionesController,
  getReporteAtencionController,
  getReporteIncidenciasController,
  getReporteVehiculosController,
  getReporteMantenimientosController,
  getReporteCiudadanosController,
  getReporteResumenController,
  exportarReporteController,
} = require('../controllers/reportes.controller');

// MIDDLEWARES
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// *********************************************************
// ROLES AUTORIZADOS
// Deben coincidir con los permisos de los services.
// *********************************************************
const ROLES_REPORTES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// *********************************************************
// AUTENTICACIÓN Y AUTORIZACIÓN
// *********************************************************
router.use(verificarToken);

router.use(
  autorizarRoles(...ROLES_REPORTES),
);

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// *********************************************************
// CONSULTAS
// *********************************************************
router.get('/resumen', getReporteResumenController);

router.get('/programaciones', getReporteProgramacionesController);

router.get('/recorridos', getReporteRecorridosController);

router.get('/recolecciones', getReporteRecoleccionesController);

router.get('/atencion-puntos', getReporteAtencionController);

router.get('/incidencias', getReporteIncidenciasController);

router.get('/vehiculos', getReporteVehiculosController);

router.get('/mantenimientos', getReporteMantenimientosController);

router.get('/ciudadanos', getReporteCiudadanosController);

// *********************************************************
// EXPORTACIÓN
// Devuelve un archivo, no un objeto JSON de éxito.
// *********************************************************
router.post('/exportar', exportarReporteController);

module.exports = router;