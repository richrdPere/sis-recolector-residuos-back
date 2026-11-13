const getCitizensPaginatedService = require('../services/get-citizens-paginated.service');

const getCitizensPaginatedController = async (req, res, next) => {
  try {
    const data = await getCitizensPaginatedService({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      estado_ciudadano: req.query.estado_ciudadano,
      origen_registro: req.query.origen_registro,
    });

    return res.json({
      success: true,
      message: 'Ciudadanos consultados.',
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCitizensPaginatedController,
};