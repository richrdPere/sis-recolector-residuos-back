// Services
const {
  getConductoresDisponiblesService,
  getRecolectoresDisponiblesService,
  getPersonalByRolService,
} = require('../services/disponibilidad/disponibilidad.service');

/*
|--------------------------------------------------------------------------
| 1. Listar conductores disponibles
|--------------------------------------------------------------------------
*/
const getConductoresDisponiblesController = async (req, res, next) => {
  try {
    const data =
      await getConductoresDisponiblesService();

    return res.status(200).json({
      success: true,
      message: 'Conductores disponibles obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Listar recolectores disponibles
|--------------------------------------------------------------------------
*/
const getRecolectoresDisponiblesController = async (req, res, next) => {
  try {
    const data = await getRecolectoresDisponiblesService();

    return res.status(200).json({
      success: true,
      message: 'Recolectores disponibles obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Listar personal disponible por rol
|--------------------------------------------------------------------------
*/
const getPersonalByRolController = async (req, res, next) => {
  try {
    const data =
      await getPersonalByRolService(
        req.params.rol,
      );

    return res.status(200).json({
      success: true,
      message: 'Personal disponible obtenido correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConductoresDisponiblesController,
  getRecolectoresDisponiblesController,
  getPersonalByRolController,
};