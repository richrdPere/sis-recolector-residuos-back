const {
  createRutaHorarioService,
  getRutaHorariosService,
  updateRutaHorarioService,
  changeRutaHorarioEstadoService,
  deleteRutaHorarioService,
} = require('../services/ruta-horario');

/*
|--------------------------------------------------------------------------
| 1. Crear ruta horario
|--------------------------------------------------------------------------
*/
const createRutaHorarioController = async (req, res, next) => {
  try {
    const data =
      await createRutaHorarioService(
        req.params.idRuta,
        req.body,
      );

    return res.status(201).json({
      success: true,
      message: 'Horario de ruta registrado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener ruta horarios
|--------------------------------------------------------------------------
*/
const getRutaHorariosController = async (req, res, next) => {
  try {
    const data =
      await getRutaHorariosService(
        req.params.idRuta,
      );

    return res.status(200).json({
      success: true,
      message:
        'Horarios de ruta obtenidos correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Actualizar ruta horarios
|--------------------------------------------------------------------------
*/
const updateRutaHorarioController = async (req, res, next) => {
  try {
    const data =
      await updateRutaHorarioService(
        req.params.idRuta,
        req.params.idHorario,
        req.body,
      );

    return res.status(200).json({
      success: true,
      message:
        'Horario de ruta actualizado correctamente.',
      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Cambiar ruta horario
|--------------------------------------------------------------------------
*/
const changeRutaHorarioEstadoController = async (req, res, next) => {
  try {
    const data = await changeRutaHorarioEstadoService({
      id_ruta:
        req.params.idRuta,

      id_horario:
        req.params.idHorario,

      estado:
        req.body.estado,
    });

    return res.status(200).json({
      success: true,

      message:
        req.body.estado
          ? 'Horario activado correctamente.'
          : 'Horario desactivado correctamente.',

      data,
    });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Eliminar ruta horario
|--------------------------------------------------------------------------
*/
const deleteRutaHorarioController =
  async (req, res, next) => {
    try {
      const data = await deleteRutaHorarioService(
        req.params.idRuta,
        req.params.idHorario,
      );

      return res.status(200).json({
        success: true,
        message:
          'Horario de ruta eliminado correctamente.',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  createRutaHorarioController,
  getRutaHorariosController,
  updateRutaHorarioController,
  changeRutaHorarioEstadoController,
  deleteRutaHorarioController,
};