// controllers/domicilio.controller.js

const {
  getMyAddressesService,
  createCitizenAddressService,
  updateCitizenAddressService,
  setPrimaryAddressService,
  deleteCitizenAddressService,
  getScheduleByAddressService,
} = require('../services');

const {
  getAuthenticatedUserId,
  parseBooleanQuery,
} = require('../utils/ciudadano-controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Obtener mis domicilios
|--------------------------------------------------------------------------
*/
const getMyAddressesController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await getMyAddressesService({
        id_usuario:
          idUsuario,

        incluir_inactivos:
          parseBooleanQuery(
            req.query.incluir_inactivos,
            false,
          ),
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Domicilios obtenidos correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Crear domicilio
|--------------------------------------------------------------------------
*/
const createCitizenAddressController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await createCitizenAddressService({
        ...req.body,

        id_usuario:
          idUsuario,
      });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Domicilio registrado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Actualizar domicilio
|--------------------------------------------------------------------------
*/
const updateCitizenAddressController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await updateCitizenAddressService({
        ...req.body,

        id_usuario:
          idUsuario,

        id_domicilio:
          req.params
            .idDomicilio,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Domicilio actualizado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Establecer domicilio principal
|--------------------------------------------------------------------------
*/
const setPrimaryAddressController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await setPrimaryAddressService({
        id_usuario:
          idUsuario,

        id_domicilio:
          req.params
            .idDomicilio,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Domicilio principal actualizado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Eliminar domicilio
|--------------------------------------------------------------------------
*/
const deleteCitizenAddressController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await deleteCitizenAddressService({
        id_usuario:
          idUsuario,

        id_domicilio:
          req.params
            .idDomicilio,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Domicilio eliminado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Obtener cronograma por domicilio
|--------------------------------------------------------------------------
*/
const getScheduleByAddressController = async (req, res, next) => {
  try {
    const idUsuario = getAuthenticatedUserId(req);

    const data =
      await getScheduleByAddressService({
        id_usuario: idUsuario,
        id_domicilio: req.params.idDomicilio,
        fecha_referencia: req.query.fecha_referencia || null,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Cronograma de recolección obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAddressesController,
  createCitizenAddressController,
  updateCitizenAddressController,
  setPrimaryAddressController,
  deleteCitizenAddressController,
  getScheduleByAddressController,
};