const db = require('../../../../database/models');

// Modelos
const {
  Zona,
  Ruta,
  RutaVersion,
} = db;

// ===============================================
// SERVICE: Obtener rutas activas
// ===============================================
const getRutasActivasService = async () => {
  return Ruta.findAll({
    where: {
      estado: true,
      estado_ruta: 'ACTIVA',
    },

    include: [
      {
        model: Zona,
        as: 'zona',

        where: {
          estado: true,
        },
      },
      {
        model: RutaVersion,
        as: 'version_vigente',
        required: true,
      },
    ],

    order: [
      ['nombre', 'ASC'],
    ],
  });
};


module.exports = getRutasActivasService;