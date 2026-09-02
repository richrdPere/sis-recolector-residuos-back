const {
  createRutaService,
  getRutasPaginatedService,
  getRutasActivasService,
  getRutasByZonaService,
  getRutaByIdService,
  updateRutaService,
  changeRutaEstadoRutaService,
  changeRutaEstadoService,
  deleteRutaService,
} = require('../services/ruta');

/*
|--------------------------------------------------------------------------
| 1. Crear ruta 
|--------------------------------------------------------------------------
*/
const createRutaController = async (req, res, next) => {
  try {
    const data =
      await createRutaService(
        req.body,
      );

    return res.status(201).json({
      success: true,
      message:
        'Ruta registrada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener rutas paginated 
|--------------------------------------------------------------------------
*/
const getRutasPaginatedController = async (req, res, next) => {
  try {
    const result =
      await getRutasPaginatedService({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,

        id_zona:
          req.query.id_zona,

        estado:
          req.query.estado,

        estado_ruta:
          req.query.estado_ruta,
      });

    return res.status(200).json({
      success: true,
      message:
        'Rutas obtenidas correctamente.',
      data: result.items,
      pagination:
        result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener rutas activas 
|--------------------------------------------------------------------------
*/
const getRutasActivasController = async (req, res, next) => {
  try {
    const data =
      await getRutasActivasService();

    return res.status(200).json({
      success: true,
      message:
        'Rutas activas obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtener rutas by zonas 
|--------------------------------------------------------------------------
*/
const getRutasByZonaController = async (req, res, next) => {
  try {
    const data =
      await getRutasByZonaService(
        req.params.idZona,
      );

    return res.status(200).json({
      success: true,
      message:
        'Rutas de la zona obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Obtener rutas by id 
|--------------------------------------------------------------------------
*/
const getRutaByIdController = async (req, res, next) => {
  try {
    const data =
      await getRutaByIdService(
        req.params.id,
      );

    return res.status(200).json({
      success: true,
      message:
        'Ruta obtenida correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Actualizar rutas by id 
|--------------------------------------------------------------------------
*/
const updateRutaController = async (req, res, next) => {
  try {
    const data =
      await updateRutaService(
        req.params.id,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Ruta actualizada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Cambiar ruta 
|--------------------------------------------------------------------------
*/
const changeRutaEstadoRutaController = async (req, res, next) => {
  try {
    const data =
      await changeRutaEstadoRutaService({
        id_ruta:
          req.params.id,

        estado_ruta:
          req.body.estado_ruta,
      });

    return res.status(200).json({
      success: true,
      message:
        'Estado operativo de la ruta actualizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 8. Change ruta 
|--------------------------------------------------------------------------
*/
const changeRutaEstadoController = async (req, res, next) => {
  try {
    const data =
      await changeRutaEstadoService({
        id_ruta:
          req.params.id,

        estado:
          req.body.estado,
      });

    return res.status(200).json({
      success: true,

      message:
        req.body.estado
          ? 'Registro de ruta activado correctamente.'
          : 'Registro de ruta desactivado correctamente.',

      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 9. Eliminar ruta 
|--------------------------------------------------------------------------
*/
const deleteRutaController = async (req, res, next) => {
  try {
    const data =
      await deleteRutaService(
        req.params.id,
      );

    return res.status(200).json({
      success: true,
      message:
        'Ruta eliminada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRutaController,
  getRutasPaginatedController,
  getRutasActivasController,
  getRutasByZonaController,
  getRutaByIdController,
  updateRutaController,
  changeRutaEstadoRutaController,
  changeRutaEstadoController,
  deleteRutaController,
};