const {
  addProgramacionPersonalService,
  getProgramacionPersonalService,
  getMisAsignacionesService,
  removeProgramacionPersonalService,
  respondAssignmentService,
} = require('../services/programacion-personal');

const {
  getRequestMetadata,
  getAuthenticatedUserId,
} = require('../utils/controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Asignar personal
|--------------------------------------------------------------------------
*/
const addProgramacionPersonalController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await addProgramacionPersonalService({
      id_programacion: req.params.idProgramacion,
      id_personal: req.body.id_personal,
      funcion: req.body.funcion,
      observacion: req.body.observacion,
      ...metadata,
    });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Personal asignado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener personal asignado a una programación
|--------------------------------------------------------------------------
*/
const getProgramacionPersonalController = async (req, res, next) => {
  try {
    const data = await getProgramacionPersonalService({
      id_programacion: req.params.idProgramacion,
      funcion: req.query.funcion,
      estado_asignacion: req.query.estado_asignacion,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Personal asignado obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener mis asignaciones
|--------------------------------------------------------------------------
*/
const getMisAsignacionesController = async (req, res, next) => {
  try {
    const idUsuario = getAuthenticatedUserId(req);

    const data = await getMisAsignacionesService({
      id_usuario: idUsuario,
      page: req.query.page,
      limit: req.query.limit,
      estado_asignacion: req.query.estado_asignacion,
      estado_programacion: req.query.estado_programacion,
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Asignaciones obtenidas correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Retirar personal de una programación
|--------------------------------------------------------------------------
*/
const removeProgramacionPersonalController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await removeProgramacionPersonalService({
      id_programacion: req.params.idProgramacion,
      id_programacion_personal: req.params.idProgramacionPersonal,
      motivo: req.body.motivo,
      observacion: req.body.observacion,
      ...metadata,
    });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Personal retirado de la programación correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Aceptar o rechazar una asignación
|--------------------------------------------------------------------------
*/
const respondAssignmentController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const estadoAsignacion =
      String(
        req.body.estado_asignacion || '',
      )
        .trim()
        .toUpperCase();

    const data = await respondAssignmentService({
      id_programacion_personal: req.params.idProgramacionPersonal,
      id_usuario: getAuthenticatedUserId(req),
      estado_asignacion: estadoAsignacion,
      observacion: req.body.observacion,
      ip: metadata.ip,
      user_agent: metadata.user_agent,
      origen: metadata.origen,
    });

    const messages = {
      ACEPTADO: 'Asignación aceptada correctamente.',
      RECHAZADO: 'Asignación rechazada correctamente.',
    };

    return res
      .status(200)
      .json({
        success: true,
        message:
          messages[
          estadoAsignacion
          ] ||
          'Respuesta de asignación registrada correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addProgramacionPersonalController,
  getProgramacionPersonalController,
  getMisAsignacionesController,
  removeProgramacionPersonalController,
  respondAssignmentController,
};