const {
  getRecorridoEventosService,
} = require(
  '../services',
);

/*
|--------------------------------------------------------------------------
| Obtener eventos de un recorrido
|--------------------------------------------------------------------------
*/
const getRecorridoEventosController =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const data =
        await getRecorridoEventosService({
          id_recorrido:
            req.params
              .idRecorrido,

          page:
            req.query.page,

          limit:
            req.query.limit,

          tipo_evento:
            req.query.tipo_evento,
        });

      return res
        .status(200)
        .json({
          success: true,
          message:
            'Eventos del recorrido obtenidos correctamente.',
          data,
        });
    } catch (error) {
      next(error);
    }
  };

module.exports = {
  getRecorridoEventosController,
};