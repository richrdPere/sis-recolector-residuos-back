const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
  Ruta,
  RutaHorario,
} = db;


// ===============================================
// SERVICE: Obtener rutas por horario
// ===============================================
const getRutaHorariosService = async (idRuta) => {
  const routeId =
    validateId(
      idRuta,
      'identificador de la ruta',
    );

  const ruta = await Ruta.findByPk(
    routeId,
  );

  if (!ruta) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  return RutaHorario.findAll({
    where: {
      id_ruta: routeId,
    },

    order: [
      ['dia_semana', 'ASC'],
      ['hora_inicio', 'ASC'],
    ],
  });
};

module.exports = getRutaHorariosService;