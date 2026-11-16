const express = require('express');
const router = express.Router();

const confirmarRecepcionService = require('../services/motor/confirmar-recepcion.service');
const diagnosticoNotificacionService = require('../services/motor/diagnostico-notificacion.service');

// Controllers
const {
  createNotificationController,
  getMyNotificationsController,
  getMyNotificationByIdController,
  getUnreadCountController,
  markNotificationReadController,
  markAllNotificationsReadController,
  archiveNotificationController,
} = require('../controllers/notificacion.controller');

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require('../../../middlewares/auth.middleware');

// =======================================================
// Roles
// =======================================================
const ROLES_GESTION = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// Todas las rutas requieren autenticación.
router.use(verificarToken);


router.post('/recepciones',
  async (req, res, next) => {
    try {
      const data = await confirmarRecepcionService({
        id_envio: req.body?.id_envio,
        prueba: req.body?.prueba,
        contexto: req.body?.contexto,

        // Siempre proviene del JWT.
        id_usuario: req.usuario.id_usuario,
      });

      return res.status(200).json({
        success: true,
        message: 'Recepción confirmada.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/diagnostico/:idNotificacion',

  autorizarRoles(...ROLES_GESTION),

  async (req, res, next) => {
    try {
      const data = await diagnosticoNotificacionService({
        id_notificacion: req.params.idNotificacion,
        page: req.query.page ?? 1,
      });

      return res.status(200).json({
        success: true,
        message: 'Diagnóstico obtenido.',
        data,
      });
    } catch (error) {
      next(error);
    }
  },
);

// =======================================================
// Gestión administrativa
// =======================================================
router.post('/enviar',
  autorizarRoles(
    ...ROLES_GESTION,
  ),
  createNotificationController,
);

// TODO: JSON DE ENVIO
// {
//   "tipo_notificacion": "SISTEMA",
//   "titulo": "Aviso operativo",
//   "mensaje": "Se realizará una actualización del sistema a las 18:00.",
//   "destinatarios": [
//     3,
//     5,
//     8
//   ],
//   "prioridad": "NORMAL",
//   "enviar_interna": true,
//   "enviar_push": false,
//   "clave_evento": "AVISO-SISTEMA-2026-09-04-001"
// }

// =======================================================
// Bandeja personal
// =======================================================
router.get('/mis-notificaciones', getMyNotificationsController);
router.get('/no-leidas/total', getUnreadCountController);
router.patch('/leer-todas', markAllNotificationsReadController);

// =======================================================
// Operaciones individuales
// =======================================================
router.get('/:idNotificacionUsuario', getMyNotificationByIdController);
router.patch('/:idNotificacionUsuario/leer', markNotificationReadController);
router.patch('/:idNotificacionUsuario/archivar', archiveNotificationController);

module.exports = router;