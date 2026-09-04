// services/get-my-notification-by-id.service.js

// Validations
const { validateId, } = require('../../validations/notificacion.validation',);

// Utils
const { getUserNotificationOrFail } = require('../../utils/notificacion-service.utils');

// =======================================================
// Service: Obtener notificacion by id
// =======================================================
const getMyNotificationByIdService = async ({
  id_notificacion_usuario,
  id_usuario,
}) => {
  const notificationUserId =
    validateId(
      id_notificacion_usuario,
      'identificador de la notificación',
    );

  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  return getUserNotificationOrFail({
    id_notificacion_usuario:
      notificationUserId,

    id_usuario:
      userId,
  });
};

module.exports = getMyNotificationByIdService;