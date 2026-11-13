const {
  CONSENTIMIENTO,
  registrarAlertaPublicaService,
} = require('../services/registrar-alerta-publica.service');

const getConfiguracionAlertasController = (
  _req,
  res,
) => {
  return res.status(200).json({
    success: true,
    message: 'Configuración de registro obtenida.',
    data: CONSENTIMIENTO,
  });
};

const registrarAlertaPublicaController = async (
  req,
  res,
  next,
) => {
  try {
    const data =
      await registrarAlertaPublicaService(
        req.body,
      );

    return res.status(200).json({
      success: true,

      message:
        'Registro guardado. Falta vincular el navegador ' +
        'para recibir notificaciones.',

      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConfiguracionAlertasController,
  registrarAlertaPublicaController,
};