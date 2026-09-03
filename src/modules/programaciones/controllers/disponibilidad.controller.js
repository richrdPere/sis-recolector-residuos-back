const {
  getConductoresDisponiblesService,
  getRecolectoresDisponiblesService,
  getVehiculosDisponiblesService,
} = require(
  '../services/disponibilidad',
);

/*
|--------------------------------------------------------------------------
| Construir parámetros comunes de disponibilidad
|--------------------------------------------------------------------------
*/
const getAvailabilityParams = (
  req,
) => ({
  fecha_programada: req.query.fecha_programada,
  hora_inicio_programada: req.query.hora_inicio_programada,
  hora_fin_programada: req.query.hora_fin_programada,
  exclude_programacion_id: req.query.exclude_programacion_id,
});

/*
|--------------------------------------------------------------------------
| Construir parámetros de búsqueda de personal
|--------------------------------------------------------------------------
*/
const getPersonalAvailabilityParams = (
  req,
) => ({
  ...getAvailabilityParams(req),
  search: req.query.search,
  page: req.query.page,
  limit: req.query.limit,
});

/*
|--------------------------------------------------------------------------
| 1. Obtener conductores disponibles
|--------------------------------------------------------------------------
*/
const getConductoresDisponiblesController = async (req, res, next) => {
  try {
    const data =
      await getConductoresDisponiblesService(
        getPersonalAvailabilityParams(
          req,
        ),
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Conductores disponibles obtenidos correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener recolectores disponibles
|--------------------------------------------------------------------------
*/
const getRecolectoresDisponiblesController = async (req, res, next) => {
  try {
    const data =
      await getRecolectoresDisponiblesService(
        getPersonalAvailabilityParams(
          req,
        ),
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recolectores disponibles obtenidos correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener vehículos disponibles
|--------------------------------------------------------------------------
*/
const getVehiculosDisponiblesController = async (req, res, next) => {
  try {
    const data =
      await getVehiculosDisponiblesService(
        getAvailabilityParams(
          req,
        ),
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Vehículos disponibles obtenidos correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConductoresDisponiblesController,
  getRecolectoresDisponiblesController,
  getVehiculosDisponiblesController,
};