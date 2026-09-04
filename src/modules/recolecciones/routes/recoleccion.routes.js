const express = require('express');
const router = express.Router();

// Controllers
const {
  registerCollectionController,
  registerCollectionBatchController,
  getCollectionByIdController,
  getRouteCollectionPointsController,
  getRouteProgressController,
  annulCollectionController,
  registerEvidenceController,
  getCollectionEvidencesController,
  annulEvidenceController,
  getRecorridoCapacidadController,
} = require('../controllers/recoleccion.controller');

// Middlewares
const { uploadCollectionEvidence } = require('../../../middlewares/recoleccion-upload.middleware');

const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// ===============================================
// Roles
// ===============================================
const ROLES_OPERACION = [
  'CONDUCTOR',
  'RECOLECTOR',
];

const ROLES_EQUIPO = [
  'CONDUCTOR',
  'RECOLECTOR',
  'SUPERVISOR',
];

const ROLES_CONSULTA = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'OPERADOR',
];

const ROLES_DETALLE = [
  ...new Set([
    ...ROLES_EQUIPO,
    ...ROLES_CONSULTA,
  ]),
];

const ROLES_GESTION = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// Todas las rutas requieren autenticación.

router.use(verificarToken);

// ===============================================
// Registro móvil
// ===============================================

router.post('/lote',
  autorizarRoles(
    ...ROLES_OPERACION,
  ),
  registerCollectionBatchController,
);

router.post('/',
  autorizarRoles(
    ...ROLES_OPERACION,
  ),
  registerCollectionController,
);

// ===============================================
// Consultas por recorrido
// ===============================================

router.get('/recorridos/:idRecorrido/puntos',
  autorizarRoles(
    ...ROLES_DETALLE,
  ),
  getRouteCollectionPointsController,
);

router.get('/recorridos/:idRecorrido/progreso',
  autorizarRoles(
    ...ROLES_DETALLE,
  ),
  getRouteProgressController,
);

// ===============================================
// Evidencias
// ===============================================

router.patch('/evidencias/:idEvidencia/anular',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  annulEvidenceController,
);

router.post('/:idRecoleccion/evidencias',
  autorizarRoles(
    ...ROLES_OPERACION,
  ),
  uploadCollectionEvidence.single('archivo'),
  registerEvidenceController,
);

router.get('/:idRecoleccion/evidencias',
  autorizarRoles(
    ...ROLES_DETALLE,
  ),
  getCollectionEvidencesController,
);

// ===============================================
// Anulación y detalle
// ===============================================
router.patch('/:idRecoleccion/anular',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  annulCollectionController,
);

router.get('/:idRecoleccion',
  autorizarRoles(
    ...ROLES_DETALLE,
  ),
  getCollectionByIdController,
);

router.get('/:idRecorrido/capacidad',
  autorizarRoles(
    ...ROLES_DETALLE,
  ),
  getRecorridoCapacidadController,
);

module.exports = router;