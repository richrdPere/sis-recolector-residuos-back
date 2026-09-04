const {
  registerDeviceService,
  getMyDevicesService,
  deactivateDeviceService,
  deactivateDeviceByTokenService,
} = require('../services/dispositivos');

const {
  getAuthenticatedUserId,
} = require(
  '../utils/notificacion-controller.utils',
);

/*
|--------------------------------------------------------------------------
| 1. Registrar o actualizar dispositivo
|--------------------------------------------------------------------------
*/
const registerDeviceController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await registerDeviceService(
        req.body,
        {
          id_usuario:
            idUsuario,
        },
      );

    return res
      .status(
        data.creado
          ? 201
          : 200,
      )
      .json({
        success:
          true,

        message:
          data.creado
            ? 'Dispositivo registrado correctamente.'
            : 'Token del dispositivo actualizado correctamente.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener mis dispositivos
|--------------------------------------------------------------------------
*/
const getMyDevicesController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await getMyDevicesService(
        idUsuario,
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          data.length
            ? 'Dispositivos obtenidos correctamente.'
            : 'No se encontraron dispositivos registrados.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Desactivar dispositivo por ID
|--------------------------------------------------------------------------
*/
const deactivateDeviceController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await deactivateDeviceService(
        req.params
          .idDispositivo,
        {
          id_usuario:
            idUsuario,

          motivo:
            req.body
              .motivo ||
            'Dispositivo desactivado por el usuario.',
        },
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          data
            .ya_estaba_desactivado
            ? 'El dispositivo ya se encontraba desactivado.'
            : 'Dispositivo desactivado correctamente.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Desactivar dispositivo por token
|--------------------------------------------------------------------------
*/
const deactivateDeviceByTokenController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await deactivateDeviceByTokenService(
        {
          token_push:
            req.body
              .token_push,
        },
        {
          id_usuario:
            idUsuario,
        },
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          data
            .ya_estaba_desactivado
            ? 'El token ya se encontraba desactivado.'
            : 'Token desactivado correctamente.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerDeviceController,
  getMyDevicesController,
  deactivateDeviceController,
  deactivateDeviceByTokenController,
};