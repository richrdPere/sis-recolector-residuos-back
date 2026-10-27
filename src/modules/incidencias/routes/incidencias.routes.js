const express = require('express');
const router = express.Router();

// CONTROLLERS
const {
  createIncidenciaController,
  getIncidenciasPaginadoController,
  getIncidenciaByIdController,
  updateIncidenciaController,
  asignarResponsableIncidenciaController,
  changeIncidenciaEstadoController,
  changeIncidenciaHabilitacionController,
  deleteIncidenciaController,
  agregarIncidenciaArchivosController,
  getIncidenciaArchivosController,
  getIncidenciaArchivoController,
  deleteIncidenciaArchivoController,
} = require('../controllers/incidencias.controller');

// MIDDLEWARES
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// *********************************************************
// AUTENTICACIÓN
// *********************************************************
router.use(verificarToken);

// *********************************************************
// ROLES AUTORIZADOS
// *********************************************************

// La política del service determina si puede consultar
// todas las incidencias o únicamente las propias.
const ROLES_CONSULTA = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
  'CONDUCTOR',
  'RECOLECTOR',
  'CIUDADANO',
];

// Usuarios habilitados para registrar y modificar sus reportes.
// Los services verifican propiedad, origen y estado.
const ROLES_REPORTE = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
  'CONDUCTOR',
  'RECOLECTOR',
  'CIUDADANO',
];

// Gestión administrativa de incidencias.
const ROLES_GESTION = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// *********************************************************
// CONSULTAS
// *********************************************************

router.get('/paginado',
  autorizarRoles(...ROLES_CONSULTA),
  getIncidenciasPaginadoController,
);

router.get('/view/:id',
  autorizarRoles(...ROLES_CONSULTA),
  getIncidenciaByIdController,
);

// *********************************************************
// REGISTRO Y EDICIÓN
// *********************************************************

router.post('/create',
  autorizarRoles(...ROLES_REPORTE),
  createIncidenciaController,
);

router.put('/update/:id',
  autorizarRoles(...ROLES_REPORTE),
  updateIncidenciaController,
);

// *********************************************************
// ASIGNACIÓN DE RESPONSABLE
// Body: { id_responsable: "8" }
// Para retirarlo: { id_responsable: null }
// *********************************************************

router.patch('/:id/responsable',
  autorizarRoles(...ROLES_GESTION),
  asignarResponsableIncidenciaController,
);

// *********************************************************
// ESTADO DE ATENCIÓN
//
// Body:
// {
//   estado_incidencia: "RESUELTA",
//   detalle_resolucion: "Se solucionó el problema."
// }
//
// El service limita al reportante a cancelar su reporte
// en los estados permitidos.
// *********************************************************

router.patch('/:id/estado',
  autorizarRoles(...ROLES_REPORTE),
  changeIncidenciaEstadoController,
);

// *********************************************************
// HABILITACIÓN ADMINISTRATIVA
// Body: { estado: true | false }
// *********************************************************

router.patch('/:id/habilitacion',
  autorizarRoles(...ROLES_GESTION),
  changeIncidenciaHabilitacionController,
);

// *********************************************************
// ELIMINACIÓN LÓGICA DE INCIDENCIA
// *********************************************************

router.delete('/delete/:id',
  autorizarRoles(...ROLES_GESTION),
  deleteIncidenciaController,
);

// *********************************************************
// CONSULTAS DE ARCHIVOS
// *********************************************************

router.get('/:id/archivos',
  autorizarRoles(...ROLES_CONSULTA),
  getIncidenciaArchivosController,
);

// Consulta metadatos del archivo; no descarga el binario.
router.get('/:id/archivos/:idArchivo',
  autorizarRoles(...ROLES_CONSULTA),
  getIncidenciaArchivoController,
);

// *********************************************************
// AGREGAR ARCHIVOS
//
// Antes del controller debe ejecutarse tu middleware de carga,
// validación y almacenamiento, que establece:
// req.incidenciaArchivos
// *********************************************************

router.post('/:id/archivos',
  autorizarRoles(...ROLES_REPORTE),

  // Insertar aquí el middleware de carga cuando esté disponible.

  agregarIncidenciaArchivosController,
);

// *********************************************************
// ELIMINACIÓN LÓGICA DE ARCHIVO
// *********************************************************

router.delete('/:id/archivos/:idArchivo',
  autorizarRoles(...ROLES_REPORTE),
  deleteIncidenciaArchivoController,
);

module.exports = router;