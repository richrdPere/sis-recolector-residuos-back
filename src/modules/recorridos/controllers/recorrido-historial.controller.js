// Services
const {
  ejecutar,
} = require('../../reportes/services/reporte-base.service');

const {
  detalleHistorialService,
  trazadoHistorialService,
} = require('../services/historial-recorrido.service');

// *********************************************************
// 1. OBTENER LISTADO DEL HISTORIAL
// *********************************************************
const getHistorialListadoController = async (req, res, next) => {
  try {
    const data = await ejecutar(
      'RECORRIDOS',
      {
        query: req.query,
        usuario: req.usuario,
      },
    );

    return res.status(200).json({
      success: true,
      message: 'Recorridos consultados.',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

// *********************************************************
// 2. OBTENER DETALLE DEL HISTORIAL
// *********************************************************
const getHistorialDetalleController = async (req, res, next) => {
  try {
    const data = await detalleHistorialService(
      req.params.idRecorrido,
      req.usuario,
    );

    return res.status(200).json({
      success: true,
      message: 'Detalle del historial consultado.',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

// *********************************************************
// 3. OBTENER TRAZADO DEL HISTORIAL
// *********************************************************
const getHistorialTrazadoController = async (req, res, next) => {
  try {
    const data = await trazadoHistorialService(
      req.params.idRecorrido,
      req.usuario,
    );

    return res.status(200).json({
      success: true,
      message: 'Trazado del historial consultado.',
      data,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHistorialListadoController,
  getHistorialDetalleController,
  getHistorialTrazadoController,
};