const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  Zona,
  Ruta,
  RutaVersion,
  RutaHorario,
} = db;

// Utils
const { validateId } = require('../../utils/rutas-service.utils');


// ===============================================
// SERVICE: Obtener rutas por zonas
// ===============================================
const getRutasByZonaService = async (idZona) => {
  const id =
    validateId(
      idZona,
      'identificador de la zona',
    );

  const zona =
    await Zona.findByPk(id);

  if (!zona) {
    throw new AppError(
      'La zona no fue encontrada.',
      404,
      'ZONE_NOT_FOUND',
    );
  }

  return Ruta.findAll({
    where: {
      id_zona: id,
      estado: true,
    },

    include: [
      {
        model:
          RutaVersion,

        as:
          'version_vigente',

        required: false,
      },
      {
        model:
          RutaHorario,

        as: 'horarios',

        where: {
          estado: true,
        },

        required: false,
      },
    ],

    order: [
      ['nombre', 'ASC'],
    ],
  });
};


module.exports = getRutasByZonaService;