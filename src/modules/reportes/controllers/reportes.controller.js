// SERVICES
const {
  obtenerReporteProgramacionesService,
  obtenerReporteRecorridosService,
  obtenerReporteRecoleccionesService,
  obtenerReporteAtencionService,
  obtenerReporteIncidenciasService,
  obtenerReporteVehiculosService,
  obtenerReporteMantenimientosService,
  obtenerReporteCiudadanosService,
  obtenerReporteResumenService,
  generarExportacionReporteService,
} = require('../services');

// UTILS
const {
  obtenerUsuario,
  obtenerFiltros,
  responderSolicitud,
  responderArchivo,
  obtenerSolicitudExportacion,
} = require('../utils/reportes-controller.utils');

// EXPORTADORES
const { obtenerExportador } = require('../exporters');

// *********************************************************
// UTILIDAD: CONSTRUIR CONTROLLER DE CONSULTA
// *********************************************************
const crearConsulta = (
  servicio,
  mensaje,
  contexto,
) => async (req, res) => {
  return responderSolicitud(
    res,

    () => servicio({
      usuario: obtenerUsuario(req),
      query: obtenerFiltros(req.query),
    }),

    mensaje,
    contexto,
  );
};

// *********************************************************
// 1. PROGRAMACIONES
// *********************************************************
const getReporteProgramacionesController = crearConsulta(
  obtenerReporteProgramacionesService,
  'Reporte de programaciones obtenido correctamente.',
  'getReporteProgramacionesController',
);

// *********************************************************
// 2. RECORRIDOS
// *********************************************************
const getReporteRecorridosController = crearConsulta(
  obtenerReporteRecorridosService,
  'Reporte de recorridos obtenido correctamente.',
  'getReporteRecorridosController',
);

// *********************************************************
// 3. RESIDUOS RECOLECTADOS
// *********************************************************
const getReporteRecoleccionesController = crearConsulta(
  obtenerReporteRecoleccionesService,
  'Reporte de residuos recolectados obtenido correctamente.',
  'getReporteRecoleccionesController',
);

// *********************************************************
// 4. ATENCIÓN DE PUNTOS
// *********************************************************
const getReporteAtencionController = crearConsulta(
  obtenerReporteAtencionService,
  'Reporte de atención de puntos obtenido correctamente.',
  'getReporteAtencionController',
);

// *********************************************************
// 5. INCIDENCIAS
// *********************************************************
const getReporteIncidenciasController = crearConsulta(
  obtenerReporteIncidenciasService,
  'Reporte de incidencias obtenido correctamente.',
  'getReporteIncidenciasController',
);

// *********************************************************
// 6. VEHÍCULOS
// *********************************************************
const getReporteVehiculosController = crearConsulta(
  obtenerReporteVehiculosService,
  'Reporte de vehículos obtenido correctamente.',
  'getReporteVehiculosController',
);

// *********************************************************
// 7. MANTENIMIENTOS
// *********************************************************
const getReporteMantenimientosController = crearConsulta(
  obtenerReporteMantenimientosService,
  'Reporte de mantenimientos obtenido correctamente.',
  'getReporteMantenimientosController',
);

// *********************************************************
// 8. REPORTES CIUDADANOS
// *********************************************************
const getReporteCiudadanosController = crearConsulta(
  obtenerReporteCiudadanosService,
  'Reporte de incidencias ciudadanas obtenido correctamente.',
  'getReporteCiudadanosController',
);

// *********************************************************
// 9. RESUMEN OPERATIVO
// *********************************************************
const getReporteResumenController = crearConsulta(
  obtenerReporteResumenService,
  'Resumen operativo obtenido correctamente.',
  'getReporteResumenController',
);

// *********************************************************
// 10. EXPORTAR REPORTE
// *********************************************************
const exportarReporteController = async (req, res) => {
  return responderArchivo(
    res,

    () => {
      const usuario = obtenerUsuario(req);

      const solicitud =
        obtenerSolicitudExportacion(req.body);

      const renderizar = obtenerExportador(
        solicitud.formato,
      );

      return generarExportacionReporteService({
        ...solicitud,

        // Siempre procede de la autenticación.
        usuario,

        // Siempre procede del registro del servidor.
        renderizar,

        ip: req.ip || null,

        user_agent:
          req.get('user-agent') || null,
      });
    },

    'exportarReporteController',
  );
};

// *********************************************************
// EXPORTS
// *********************************************************
module.exports = {
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
};