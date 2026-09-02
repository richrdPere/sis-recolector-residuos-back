// Services
const {
  createPersonalService,
  getPersonalPaginatedService,
  getPersonalByIdService,
  updatePersonalService,
  changePersonalEstadoService,
  deletePersonalService,
} = require('../services/personal');


/*
|--------------------------------------------------------------------------
| 1. Crear personal operativo
|--------------------------------------------------------------------------
*/
const createPersonalController = async (req, res, next) => {
  try {
    const data =
      await createPersonalService(
        req.body,
      );

    return res.status(201).json({
      success: true,
      message:
        'Personal operativo registrado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Listar personal operativo + Paginado
|--------------------------------------------------------------------------
*/
const getPersonalPaginatedController = async (req, res, next) => {
  try {
    const result = await getPersonalPaginatedService({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      estado: req.query.estado,
      estado_laboral: req.query.estado_laboral,
      tipo_contrato: req.query.tipo_contrato,
      rol: req.query.rol,
    });

    return res.status(200).json({
      success: true,
      message: 'Personal operativo obtenido correctamente.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener personal por ID
|--------------------------------------------------------------------------
*/
const getPersonalByIdController = async (req, res, next) => {
  try {
    const data = await getPersonalByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Personal operativo obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Actualizar personal operativo
|--------------------------------------------------------------------------
*/
const updatePersonalController = async (req, res, next) => {
  try {
    const data = await updatePersonalService(
      req.params.id,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: 'Personal operativo actualizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Activar o desactivar personal
|--------------------------------------------------------------------------
*/
const changePersonalEstadoController = async (req, res, next) => {
  try {
    const data =
      await changePersonalEstadoService({
        id_personal: req.params.id,
        estado: req.body.estado,
      });

    return res.status(200).json({
      success: true,
      message:
        req.body.estado
          ? 'Personal operativo activado correctamente.'
          : 'Personal operativo desactivado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Eliminar personal operativo
|--------------------------------------------------------------------------
*/
const deletePersonalController = async (req, res, next) => {
  try {
    const data = await deletePersonalService(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Personal operativo eliminado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPersonalController,
  getPersonalPaginatedController,
  getPersonalByIdController,
  updatePersonalController,
  changePersonalEstadoController,
  deletePersonalController,
};