const {
  getOperationalMonitorService,
  getActiveRoutesMapService,
  getRouteMonitorDetailService,
  getOperationalAlertsService,
} = require('../services');

/*
|--------------------------------------------------------------------------
| 1. Obtener resumen del monitoreo operativo
|--------------------------------------------------------------------------
*/
const getOperationalMonitorController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getOperationalMonitorService({
      fecha: req.query.fecha,
      id_zona: req.query.id_zona,
      id_ruta: req.query.id_ruta,
      id_vehiculo: req.query.id_vehiculo,
      estado_programacion:
        req.query.estado_programacion,
      estado_recorrido:
        req.query.estado_recorrido,
      solo_alertas: req.query.solo_alertas,
    });

    return res.status(200).json({
      success: true,
      message:
        'Monitoreo operativo obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. Obtener recorridos activos para el mapa
|--------------------------------------------------------------------------
*/
const getActiveRoutesMapController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getActiveRoutesMapService({
      fecha: req.query.fecha,
      id_zona: req.query.id_zona,
      id_ruta: req.query.id_ruta,
      id_vehiculo: req.query.id_vehiculo,
      estado_programacion:
        req.query.estado_programacion,
      estado_recorrido:
        req.query.estado_recorrido,
    });

    return res.status(200).json({
      success: true,
      message:
        'Recorridos activos del mapa obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 3. Obtener detalle de monitoreo de un recorrido
|--------------------------------------------------------------------------
*/
const getRouteMonitorDetailController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getRouteMonitorDetailService({
      id_recorrido: req.params.idRecorrido,
    });

    return res.status(200).json({
      success: true,
      message:
        'Detalle de monitoreo obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 4. Obtener alertas operativas calculadas
|--------------------------------------------------------------------------
*/
const getOperationalAlertsController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getOperationalAlertsService({
      fecha: req.query.fecha,
      id_zona: req.query.id_zona,
      id_ruta: req.query.id_ruta,
      id_vehiculo: req.query.id_vehiculo,
      estado_programacion:
        req.query.estado_programacion,
      estado_recorrido:
        req.query.estado_recorrido,
      nivel: req.query.nivel,
      page: req.query.page,
      limit: req.query.limit,
    });

    return res.status(200).json({
      success: true,
      message:
        'Alertas operativas obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOperationalMonitorController,
  getActiveRoutesMapController,
  getRouteMonitorDetailController,
  getOperationalAlertsController,
};