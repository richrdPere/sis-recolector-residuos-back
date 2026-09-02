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
// SERVICE: Ruta version vigente
// ===============================================
const getRutaVersionVigenteService = async (idRuta) => {
  const id = validateId(
    idRuta,
    'identificador de la ruta',
  );

  const route =
    await Ruta.findByPk(id);

  if (!route) {
    throw new AppError(
      'La ruta no fue encontrada.',
      404,
      'ROUTE_NOT_FOUND',
    );
  }

  const version =
    await RutaVersion.findOne({
      where: {
        id_ruta: id,
        vigente: true,
        estado: true,
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

  if (!version) {
    throw new AppError(
      'La ruta no tiene una versión vigente.',
      404,
      'CURRENT_ROUTE_VERSION_NOT_FOUND',
    );
  }

  return version;
};

module.exports = getRutaVersionVigenteService;