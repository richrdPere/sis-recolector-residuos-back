const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
  Ruta,
  RutaVersion,
  RutaPunto,
} = db;

// ===============================================
// SERVICE: Obtener versiones de una ruta
// ===============================================
const getRutaVersionesService = async (idRuta) => {
  const id = validateId(
    idRuta,
    'identificador de la ruta',
  );

  const ruta =
    await Ruta.findByPk(id);

  if (!ruta) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  return RutaVersion.findAll({
    where: {
      id_ruta: id,
    },

    include: [
      {
        model:
          RutaPunto,

        as: 'puntos',

        where: {
          estado: true,
        },

        required: false,
      },
    ],

    order: [
      [
        'numero_version',
        'DESC',
      ],
      [
        {
          model:
            RutaPunto,

          as: 'puntos',
        },
        'orden',
        'ASC',
      ],
    ],
  });
};

module.exports = getRutaVersionesService;