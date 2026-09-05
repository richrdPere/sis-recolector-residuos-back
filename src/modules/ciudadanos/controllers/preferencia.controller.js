// controllers/preferencia.controller.js

const {
  getNotificationPreferencesService,
  updateNotificationPreferencesService,
} = require('../services');

const { getAuthenticatedUserId } = require('../utils/ciudadano-controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Obtener preferencias
|--------------------------------------------------------------------------
*/
const getNotificationPreferencesController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await getNotificationPreferencesService(
        idUsuario,
      );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Preferencias de notificación obtenidas correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. Actualizar preferencias
|--------------------------------------------------------------------------
*/
const updateNotificationPreferencesController = async (req, res, next) => {
  try {
    const idUsuario = getAuthenticatedUserId(req);

    const data =
      await updateNotificationPreferencesService({
        ...req.body,

        id_usuario:
          idUsuario,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Preferencias de notificación actualizadas correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotificationPreferencesController,
  updateNotificationPreferencesController,
};