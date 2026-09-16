const {
  getDashboardSummaryService,
  getProgrammingIndicatorsService,
  getCollectionIndicatorsService,
  getVehicleIndicatorsService,
  getRoutePerformanceService,
  getDashboardTrendsService,
} = require('../services');

/*
|--------------------------------------------------------------------------
| Construir filtros comunes del dashboard
|--------------------------------------------------------------------------
|
| No realiza validaciones. Los services son responsables de normalizar y
| validar fechas, IDs, agrupación, paginación y ordenamiento.
|
*/
const getDashboardFilters = (req) => ({
  fecha_inicio: req.query.fecha_inicio,
  fecha_fin: req.query.fecha_fin,
  id_zona: req.query.id_zona,
  id_ruta: req.query.id_ruta,
  id_vehiculo: req.query.id_vehiculo,
  agrupacion: req.query.agrupacion,
});

/*
|--------------------------------------------------------------------------
| 1. Obtener resumen general del dashboard
|--------------------------------------------------------------------------
*/
const getDashboardSummaryController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getDashboardSummaryService(
      getDashboardFilters(req),
    );

    return res.status(200).json({
      success: true,
      message:
        'Resumen del dashboard obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 2. Obtener indicadores de programaciones
|--------------------------------------------------------------------------
*/
const getProgrammingIndicatorsController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getProgrammingIndicatorsService(
      getDashboardFilters(req),
    );

    return res.status(200).json({
      success: true,
      message:
        'Indicadores de programaciones obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 3. Obtener indicadores de recolecciones
|--------------------------------------------------------------------------
*/
const getCollectionIndicatorsController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getCollectionIndicatorsService(
      getDashboardFilters(req),
    );

    return res.status(200).json({
      success: true,
      message:
        'Indicadores de recolecciones obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 4. Obtener indicadores de vehículos
|--------------------------------------------------------------------------
*/
const getVehicleIndicatorsController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getVehicleIndicatorsService(
      getDashboardFilters(req),
    );

    return res.status(200).json({
      success: true,
      message:
        'Indicadores de vehículos obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 5. Obtener rendimiento de rutas
|--------------------------------------------------------------------------
*/
const getRoutePerformanceController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getRoutePerformanceService({
      ...getDashboardFilters(req),
      page: req.query.page,
      limit: req.query.limit,
      order_by: req.query.order_by,
      order_direction: req.query.order_direction,
    });

    return res.status(200).json({
      success: true,
      message:
        'Rendimiento de rutas obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| 6. Obtener tendencias del dashboard
|--------------------------------------------------------------------------
*/
const getDashboardTrendsController = async (
  req,
  res,
  next,
) => {
  try {
    const data = await getDashboardTrendsService(
      getDashboardFilters(req),
    );

    return res.status(200).json({
      success: true,
      message:
        'Tendencias del dashboard obtenidas correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummaryController,
  getProgrammingIndicatorsController,
  getCollectionIndicatorsController,
  getVehicleIndicatorsController,
  getRoutePerformanceController,
  getDashboardTrendsController,
};