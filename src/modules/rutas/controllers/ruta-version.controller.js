const {
  createRutaVersionService,
  getRutaVersionesService,
  getRutaVersionVigenteService,
  updateRutaVersionService,
  activarRutaVersionService,
  deleteRutaVersionService,
} = require('../services/ruta-version');

/*
|--------------------------------------------------------------------------
| 1. Crear ruta version
|--------------------------------------------------------------------------
*/
const createRutaVersionController = async (req, res, next) => {
  try {
    const data =
      await createRutaVersionService(
        req.params.idRuta,
        req.body,
      );

    return res.status(201).json({
      success: true,
      message:
        'Versión de ruta registrada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener ruta versiones
|--------------------------------------------------------------------------
*/
const getRutaVersionesController = async (req, res, next) => {
  try {
    const data =
      await getRutaVersionesService(
        req.params.idRuta,
      );

    return res.status(200).json({
      success: true,
      message:
        'Versiones de la ruta obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener ruta versiones
|--------------------------------------------------------------------------
*/
const getRutaVersionVigenteController = async (req, res, next) => {
  try {
    const data =
      await getRutaVersionVigenteService(
        req.params.idRuta,
      );

    return res.status(200).json({
      success: true,
      message:
        'Versión vigente obtenida correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Actualizar ruta versiones
|--------------------------------------------------------------------------
*/
const updateRutaVersionController = async (req, res, next) => {
  try {
    const data =
      await updateRutaVersionService(
        req.params.idVersion,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Versión de ruta actualizada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Activar ruta versiones
|--------------------------------------------------------------------------
*/
const activarRutaVersionController = async (req, res, next) => {
  try {
    const data =
      await activarRutaVersionService(
        req.params.idVersion,
      );

    return res.status(200).json({
      success: true,
      message:
        'Versión de ruta activada como vigente correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Eliminar ruta versiones
|--------------------------------------------------------------------------
*/
const deleteRutaVersionController = async (req, res, next) => {
  try {
    const data =
      await deleteRutaVersionService(
        req.params.idVersion,
      );

    return res.status(200).json({
      success: true,
      message:
        'Versión de ruta eliminada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRutaVersionController,
  getRutaVersionesController,
  getRutaVersionVigenteController,
  updateRutaVersionController,
  activarRutaVersionController,
  deleteRutaVersionController,
};