// services/get-notification-preferences.service.js

const db = require('../../../database/models');

// Validations
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
const {
  CiudadanoPreferenciaNotificacion,
} = db;

// ===============================================
// SERVICE: Obtener preferencias
// ===============================================
const getNotificationPreferencesService = async (idUsuario) => {
  const userId =
    validateId(
      idUsuario,
      'identificador del usuario',
    );

  const ciudadano =
    await getCitizenByUserOrFail(
      userId,
    );

  const [
    preferencias,
  ] =
    await CiudadanoPreferenciaNotificacion
      .findOrCreate({
        where: {
          id_ciudadano:
            ciudadano
              .id_ciudadano,
        },

        defaults: {
          id_ciudadano:
            ciudadano
              .id_ciudadano,

          notificaciones_habilitadas:
            true,

          canal_push:
            true,

          canal_interno:
            true,

          estado_preferencia:
            'ACTIVA',
        },
      });

  return preferencias;
};

module.exports = getNotificationPreferencesService;