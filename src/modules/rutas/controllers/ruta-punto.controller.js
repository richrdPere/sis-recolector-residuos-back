const {
  createRutaPuntoService,
  updateRutaPuntoService,
  reorderRutaPuntosService,
  deleteRutaPuntoService,
} = require('../services/ruta-punto');

/*
|--------------------------------------------------------------------------
| 1. Crear ruta punto
|--------------------------------------------------------------------------
*/
const createRutaPuntoController = async (req, res, next) => {
  try {
    const data = await createRutaPuntoService(
      req.params.idVersion,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message:
        'Punto de ruta registrado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Actualizar ruta punto
|--------------------------------------------------------------------------
*/
const updateRutaPuntoController = async (req, res, next) => {
  try {
    const data =
      await updateRutaPuntoService(
        req.params.idVersion,
        req.params.idPunto,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Punto de ruta actualizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Reorder rutas punto
|--------------------------------------------------------------------------
*/
const reorderRutaPuntosController = async (req, res, next) => {
  try {
    const data =
      await reorderRutaPuntosService(
        req.params.idVersion,
        req.body.puntos,
      );

    return res.status(200).json({
      success: true,
      message:
        'Puntos de ruta reordenados correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Eliminar rutas punto
|--------------------------------------------------------------------------
*/
const deleteRutaPuntoController = async (req, res, next) => {
  try {
    const data =
      await deleteRutaPuntoService(
        req.params.idVersion,
        req.params.idPunto,
      );

    return res.status(200).json({
      success: true,
      message:
        'Punto de ruta eliminado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRutaPuntoController,
  updateRutaPuntoController,
  reorderRutaPuntosController,
  deleteRutaPuntoController,
};