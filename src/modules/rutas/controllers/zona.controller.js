const {
  createZonaService,
  getZonasPaginatedService,
  getZonasActivasService,
  getZonaByIdService,
  updateZonaService,
  changeZonaEstadoService,
  deleteZonaService,
} = require('../services/zona');

/*
|--------------------------------------------------------------------------
| 1. Crear zona 
|--------------------------------------------------------------------------
*/
const createZonaController = async (req, res, next) => {
  try {
    const data =
      await createZonaService(
        req.body,
      );

    return res.status(201).json({
      success: true,
      message:
        'Zona registrada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obencion paginated 
|--------------------------------------------------------------------------
*/
const getZonasPaginatedController = async (req, res, next) => {
  try {
    const result =
      await getZonasPaginatedService({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        estado: req.query.estado,
      });

    return res.status(200).json({
      success: true,
      message:
        'Zonas obtenidas correctamente.',
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
| 3. Obtencion zonas activas 
|--------------------------------------------------------------------------
*/
const getZonasActivasController = async (req, res, next) => {
  try {
    const data = await getZonasActivasService();

    return res.status(200).json({
      success: true,
      message:
        'Zonas activas obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtencion por id 
|--------------------------------------------------------------------------
*/
const getZonaByIdController = async (req, res, next) => {
  try {
    const data =
      await getZonaByIdService(
        req.params.id,
      );

    return res.status(200).json({
      success: true,
      message:
        'Zona obtenida correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Actualizacion zona 
|--------------------------------------------------------------------------
*/
const updateZonaController = async (req, res, next) => {
  try {
    const data =
      await updateZonaService(
        req.params.id,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Zona actualizada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Cambiar zona estado 
|--------------------------------------------------------------------------
*/
const changeZonaEstadoController = async (req, res, next) => {
  try {
    const data =
      await changeZonaEstadoService({
        id_zona:
          req.params.id,

        estado:
          req.body.estado,
      });

    return res.status(200).json({
      success: true,

      message:
        req.body.estado
          ? 'Zona activada correctamente.'
          : 'Zona desactivada correctamente.',

      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Eliminar zona
|--------------------------------------------------------------------------
*/
const deleteZonaController = async (req, res, next) => {
  try {
    const data =
      await deleteZonaService(
        req.params.id,
      );

    return res.status(200).json({
      success: true,
      message:
        'Zona eliminada correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createZonaController,
  getZonasPaginatedController,
  getZonasActivasController,
  getZonaByIdController,
  updateZonaController,
  changeZonaEstadoController,
  deleteZonaController,
};