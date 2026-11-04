const { resolverCoberturaService } = require('../services');

const { getAuthenticatedUserId } = require('../utils/ciudadano-controller.utils');

const resolverCoberturaController = async (req, res, next) => {
  try {
    const data = await resolverCoberturaService({
      id_usuario: getAuthenticatedUserId(req),

      latitud: req.body?.latitud,
      longitud: req.body?.longitud,
    });

    return res.status(200).json({
      success: true,

      message: data.tiene_cobertura
        ? 'Cobertura encontrada para la ubicación.'
        : 'La ubicación no coincide con las zonas de cobertura configuradas.',

      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolverCoberturaController,
};