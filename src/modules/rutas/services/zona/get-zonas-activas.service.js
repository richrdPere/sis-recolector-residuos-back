const db = require('../../../../database/models');

// Modelos
const { Zona } = db;

// ===============================================
// SERVICE: Obtener zona activas
// ===============================================
const getZonasActivasService = async () => {
    return Zona.findAll({
        where: {
            estado: true,
        },

        order: [
            ['nombre', 'ASC'],
        ],
    });
};

module.exports = getZonasActivasService;