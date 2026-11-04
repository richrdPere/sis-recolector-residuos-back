// services/get-notification-preferences.service.js

const db = require('../../../database/models');

// Validations
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
// const {
//   CiudadanoPreferenciaNotificacion,
// } = db;

// ===============================================
// SERVICE: Obtener preferencias
// ===============================================
const getNotificationPreferencesService = async (idUsuario) => {
  const userId = validateId(
    idUsuario,
    'identificador del usuario',
  );

  return db.sequelize.transaction(
    async (transaction) => {
      const ciudadano =
        await getCitizenByUserOrFail(
          userId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      const [preferencias] =
        await db.CiudadanoPreferenciaNotificacion.findOrCreate({
          where: {
            id_ciudadano: ciudadano.id_ciudadano,
          },
          defaults: {
            id_ciudadano: ciudadano.id_ciudadano,
            notificaciones_habilitadas: false,
            canal_push: true,
            canal_interno: true,
            estado_preferencia: 'INACTIVA',
          },
          transaction,
        });

      if (
        ciudadano.acepta_tratamiento_datos !== true ||
        ciudadano.estado_ciudadano !== 'ACTIVO'
      ) {
        await preferencias.update(
          {
            notificaciones_habilitadas: false,
            estado_preferencia: 'INACTIVA',
          },
          {
            transaction,
          },
        );
      }

      return preferencias;
    },
  );

  // const ciudadano = await getCitizenByUserOrFail(
  //   userId,
  // );

  // const [
  //   preferencias,
  // ] =
  //   await CiudadanoPreferenciaNotificacion
  //     .findOrCreate({
  //       where: {
  //         id_ciudadano:
  //           ciudadano
  //             .id_ciudadano,
  //       },

  //       defaults: {
  //         id_ciudadano:
  //           ciudadano
  //             .id_ciudadano,

  //         notificaciones_habilitadas:
  //           true,

  //         canal_push:
  //           true,

  //         canal_interno:
  //           true,

  //         estado_preferencia:
  //           'ACTIVA',
  //       },
  //     });

  // return preferencias;
};

module.exports = getNotificationPreferencesService;