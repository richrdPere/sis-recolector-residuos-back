const express = require('express');
const router = express.Router();

// Controllers
const c = require('../controllers/recoleccion.controller');
const evidenciaContenidoController = require('../controllers/evidencia-contenido.controller');
const autorizarAccesoRecoleccion = require('../../../middlewares/acceso-recoleccion.middleware');

// Middlewares
const { uploadCollectionEvidence } = require('../../../middlewares/recoleccion-upload.middleware');

const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// Roles
const operar = autorizarRoles(
  'CONDUCTOR',
  'RECOLECTOR',
);

const consultar = autorizarRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
  'CONDUCTOR',
  'RECOLECTOR',
);

const gestionar = autorizarRoles(
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
);

router.use(verificarToken);

// Los servicios de registro ya comprueban el equipo operativo.
router.post(
  '/register',
  operar,
  c.registerCollectionController,
);

router.post(
  '/register-lote',
  operar,
  c.registerCollectionBatchController,
);

router.get(
  '/recorridos/:idRecorrido/puntos',
  consultar,
  autorizarAccesoRecoleccion,
  c.getRouteCollectionPointsController,
);

router.get(
  '/recorridos/:idRecorrido/progreso',
  consultar,
  autorizarAccesoRecoleccion,
  c.getRouteProgressController,
);

router.post(
  '/evidencias/:idRecoleccion',
  operar,

  // Autorizar antes de guardar el archivo.
  autorizarAccesoRecoleccion,

  uploadCollectionEvidence.single('archivo'),
  c.registerEvidenceController,
);

router.patch(
  '/evidencias/:idEvidencia/anular',
  gestionar,
  autorizarAccesoRecoleccion,
  c.annulEvidenceController,
);

router.get(
  '/:idRecoleccion/evidencias/:idEvidencia/contenido',
  consultar,
  autorizarAccesoRecoleccion,
  evidenciaContenidoController,
);

router.get(
  '/:idRecoleccion/evidencias',
  consultar,
  autorizarAccesoRecoleccion,
  c.getCollectionEvidencesController,
);

router.patch(
  '/:idRecoleccion/anular',
  gestionar,
  autorizarAccesoRecoleccion,
  c.annulCollectionController,
);

router.get(
  '/view/:idRecoleccion',
  consultar,
  autorizarAccesoRecoleccion,
  c.getCollectionByIdController,
);

router.get(
  '/capacidad/:idRecorrido',
  consultar,
  autorizarAccesoRecoleccion,
  c.getRecorridoCapacidadController,
);

module.exports = router;



// const express = require('express');
// const router = express.Router();

// // Controllers
// const c = require('../controllers/recoleccion.controller');

// // const {
// //   registerCollectionController,
// //   registerCollectionBatchController,
// //   getCollectionByIdController,
// //   getRouteCollectionPointsController,
// //   getRouteProgressController,
// //   annulCollectionController,
// //   registerEvidenceController,
// //   getCollectionEvidencesController,
// //   annulEvidenceController,
// //   getRecorridoCapacidadController,
// // } = require('../controllers/recoleccion.controller');

// const evidenciaContenidoController = require(
//   '../controllers/evidencia-contenido.controller',
// );

// // Middlewares
// const { uploadCollectionEvidence } = require('../../../middlewares/recoleccion-upload.middleware');

// const {
//   verificarToken,
//   autorizarRoles,
// } = require('../../../middlewares/auth.middleware');

// // ===============================================
// // Roles
// // ===============================================
// const ROLES_OPERACION = [
//   'CONDUCTOR',
//   'RECOLECTOR',
// ];

// const ROLES_EQUIPO = [
//   'CONDUCTOR',
//   'RECOLECTOR',
//   'SUPERVISOR',
// ];

// const ROLES_CONSULTA = [
//   'SUPER_ADMIN',
//   'ADMIN',
//   'SUPERVISOR',
//   'OPERADOR',
// ];

// const ROLES_DETALLE = [
//   ...new Set([
//     ...ROLES_EQUIPO,
//     ...ROLES_CONSULTA,
//   ]),
// ];

// const ROLES_GESTION = [
//   'SUPER_ADMIN',
//   'ADMIN',
//   'SUPERVISOR',
// ];

// // Todas las rutas requieren autenticación.

// router.use(verificarToken);

// const { autorizarConsultaRecorrido } = require('../../recorridos/services/resultado-final.service');

// router.use('/recorridos/:idRecorrido',
//   autorizarConsultaRecorrido,
// );

// // ===============================================
// // Registro móvil
// // ===============================================
// router.post('/register',
//   autorizarRoles(
//     ...ROLES_OPERACION,
//   ),
//   registerCollectionController,
// );

// router.post('/register-lote',
//   autorizarRoles(
//     ...ROLES_OPERACION,
//   ),
//   registerCollectionBatchController,
// );

// // ===============================================
// // Consultas por recorrido
// // ===============================================
// router.get('/recorridos/:idRecorrido/puntos',
//   autorizarRoles(
//     ...ROLES_DETALLE,
//   ),
//   getRouteCollectionPointsController,
// );

// router.get('/recorridos/:idRecorrido/progreso',
//   autorizarRoles(
//     ...ROLES_DETALLE,
//   ),
//   getRouteProgressController,
// );

// // ===============================================
// // Evidencias
// // ===============================================
// router.post('/evidencias/:idRecoleccion',
//   autorizarRoles(
//     ...ROLES_OPERACION,
//   ),
//   uploadCollectionEvidence.single('archivo'),
//   registerEvidenceController,
// );

// router.patch('/evidencias/:idEvidencia/anular',
//   autorizarRoles(
//     ...ROLES_GESTION,
//   ),
//   annulEvidenceController,
// );

// router.get('/:idRecoleccion/evidencias',
//   autorizarRoles(
//     ...ROLES_DETALLE,
//   ),
//   getCollectionEvidencesController,
// );

// // ===============================================
// // Anulación y detalle
// // ===============================================
// router.patch('/:idRecoleccion/anular',
//   autorizarRoles(
//     ...ROLES_GESTION,
//   ),
//   annulCollectionController,
// );

// router.get('/view/:idRecoleccion',
//   autorizarRoles(
//     ...ROLES_DETALLE,
//   ),
//   getCollectionByIdController,
// );

// router.get('/capacidad/:idRecorrido',
//   autorizarRoles(
//     ...ROLES_DETALLE,
//   ),
//   getRecorridoCapacidadController,
// );

// module.exports = router;