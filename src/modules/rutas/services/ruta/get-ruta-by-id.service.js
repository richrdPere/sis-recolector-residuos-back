const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  Zona,
  Ruta,
  RutaVersion,
  RutaPunto,
  RutaHorario,
} = db;

// Utils
const { validateId } = require('../../utils/rutas-service.utils');


// ===============================================
// SERVICE: Obtener ruta por id
// ===============================================
const getRutaByIdService = async (idRuta) => {
  const id = validateId(
    idRuta,
    'identificador de la ruta',
  );

  const ruta =
    await Ruta.findByPk(id, {
      include: [
        {
          model: Zona,
          as: 'zona',
        },
        {
          model:
            RutaVersion,

          as:
            'version_vigente',

          required: false,

          include: [
            {
              model: RutaPunto,
              as: 'puntos',
              where: {
                estado: true,
              },

              required: false,
            },
          ],
        },
        {
          model: RutaHorario,
          as: 'horarios',
          where: {
            estado: true,
          },

          required: false,
        },
      ],

      order: [
        [
          {
            model: RutaVersion,
            as: 'version_vigente',
          },
          {
            model: RutaPunto,
            as: 'puntos',
          },
          'orden',
          'ASC',
        ],
      ],
    });

  if (!ruta) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  return ruta;
};

module.exports = getRutaByIdService; 