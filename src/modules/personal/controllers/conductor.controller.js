// Services
const {
  createConductorService,
  getConductorByIdService,
  updateConductorService,
  changeConductorEstadoService,
} = require('../services/conductor');

/*
|--------------------------------------------------------------------------
| 1. Crear perfil de conductor
|--------------------------------------------------------------------------
*/
const createConductorController = async (req, res, next) => {
  try {
    const data =
      await createConductorService(
        req.params.idPersonal,
        req.body,
      );

    return res.status(201).json({
      success: true,
      message:
        'Perfil de conductor registrado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener perfil de conductor
|--------------------------------------------------------------------------
*/
const getConductorByIdController = async (req, res, next) => {
  try {
    const data =
      await getConductorByIdService(
        req.params.idPersonal,
      );

    return res.status(200).json({
      success: true,
      message:
        'Perfil de conductor obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Actualizar perfil de conductor
|--------------------------------------------------------------------------
*/
const updateConductorController = async (req, res, next) => {
  try {
    const data =
      await updateConductorService(
        req.params.idPersonal,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Perfil de conductor actualizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4.Activar o desactivar perfil de conductor
|--------------------------------------------------------------------------
*/
const changeConductorEstadoController = async (req, res, next) => {
  try {
    const data =
      await changeConductorEstadoService({
        id_personal:
          req.params.idPersonal,

        estado:
          req.body.estado,
      });

    return res.status(200).json({
      success: true,
      message:
        req.body.estado
          ? 'Perfil de conductor activado correctamente.'
          : 'Perfil de conductor desactivado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createConductorController,
  getConductorByIdController,
  updateConductorController,
  changeConductorEstadoController,
};