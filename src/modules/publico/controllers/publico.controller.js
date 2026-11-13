const {
  getZonasPublicasService,
  getRutasPublicasPorZonaService,
  getInformacionRutaPublicaService,
} = require('../services/publico.service');

// ==========================================================
// CONTROLLER: LISTAR ZONAS PÚBLICAS
// ==========================================================
const getZonasPublicasController = async (
  _req,
  res,
  next,
) => {
  try {
    const data = await getZonasPublicasService();

    return res.json({
      success: true,
      message: 'Zonas consultadas.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// CONTROLLER: LISTAR RUTAS PÚBLICAS POR ZONA
// ==========================================================
const getRutasPublicasPorZonaController = async (
  req,
  res,
  next,
) => {
  try {
    const data =
      await getRutasPublicasPorZonaService(
        req.params.idZona,
      );

    return res.json({
      success: true,
      message: 'Rutas consultadas.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// CONTROLLER: INFORMACIÓN PÚBLICA DE UNA RUTA
// ==========================================================
const getInformacionRutaPublicaController = async (
  req,
  res,
  next,
) => {
  try {
    const data =
      await getInformacionRutaPublicaService(
        req.params.idRuta,
      );

    return res.json({
      success: true,
      message: 'Información pública consultada.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getZonasPublicasController,
  getRutasPublicasPorZonaController,
  getInformacionRutaPublicaController,
};