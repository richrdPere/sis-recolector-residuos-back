const {
  createProgramacionService,
  getProgramacionesPaginatedService,
  getProgramacionByIdService,
  updateProgramacionService,
  cancelProgramacionService,
} = require(
  '../services/programacion',
);

const {
  getRequestMetadata,
} = require(
  '../utils/controller.utils',
);

/*
|--------------------------------------------------------------------------
| 1. Crear programación
|--------------------------------------------------------------------------
*/
const createProgramacionController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data =
      await createProgramacionService({
        ...req.body,
        id_usuario_creacion: metadata.id_usuario,
        ip: metadata.ip,
        user_agent: metadata.user_agent,
        origen: metadata.origen,
      });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Programación creada correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener programaciones
|--------------------------------------------------------------------------
*/
const getProgramacionesPaginatedController = async (req, res, next) => {
  try {
    const data =
      await getProgramacionesPaginatedService({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        id_ruta: req.query.id_ruta,
        id_vehiculo: req.query.id_vehiculo,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        estado_programacion: req.query.estado_programacion,
        estado: req.query.estado,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Programaciones obtenidas correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener programación por ID
|--------------------------------------------------------------------------
*/
const getProgramacionByIdController = async (req, res, next) => {
  try {
    const data = await getProgramacionByIdService(req.params.idProgramacion);

    return res
      .status(200)
      .json({
        success: true,
        message: 'Programación obtenida correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Actualizar programación
|--------------------------------------------------------------------------
*/
const updateProgramacionController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await updateProgramacionService(
      req.params.idProgramacion,
      req.body,
      metadata,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Programación actualizada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Cancelar programación
|--------------------------------------------------------------------------
*/
const cancelProgramacionController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(
        req,
      );

    const data =
      await cancelProgramacionService({
        id_programacion:
          req.params
            .idProgramacion,

        motivo:
          req.body.motivo,

        observacion:
          req.body
            .observacion,

        ...metadata,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Programación cancelada correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProgramacionController,
  getProgramacionesPaginatedController,
  getProgramacionByIdController,
  updateProgramacionController,
  cancelProgramacionController,
};