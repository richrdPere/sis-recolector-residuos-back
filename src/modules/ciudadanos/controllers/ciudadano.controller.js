// controllers/ciudadano.controller.js

const {
  createCitizenProfileService,
  getMyCitizenProfileService,
  updateCitizenProfileService,
} = require('../services');

const { getAuthenticatedUserId } = require('../utils/ciudadano-controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Crear perfil ciudadano
|--------------------------------------------------------------------------
*/
const createCitizenProfileController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await createCitizenProfileService({
        ...req.body,

        /*
         * El identificador autenticado prevalece
         * sobre cualquier valor del body.
         */
        id_usuario:
          idUsuario,
      });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Perfil ciudadano creado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. Obtener mi perfil ciudadano
|--------------------------------------------------------------------------
*/
const getMyCitizenProfileController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await getMyCitizenProfileService(
        idUsuario,
      );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Perfil ciudadano obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Actualizar mi perfil ciudadano
|--------------------------------------------------------------------------
*/
const updateCitizenProfileController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await updateCitizenProfileService({
        ...req.body,

        id_usuario:
          idUsuario,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Perfil ciudadano actualizado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCitizenProfileController,
  getMyCitizenProfileController,
  updateCitizenProfileController,
};