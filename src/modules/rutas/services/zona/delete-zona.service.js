const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
    Zona,
    Ruta,
} = db;

// ===============================================
// SERVICE: Delete zonas
// ===============================================
const deleteZonaService = async (idZona) => {
    const id = validateId(
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

    const routesCount =
        await Ruta.count({
            where: {
                id_zona: id,
            },
        });

    if (routesCount > 0) {
        throw new AppError(
            'No se puede eliminar una zona que contiene rutas.',
            409,
            'ZONE_HAS_ROUTES',
        );
    }

    await zona.destroy();

    return {
        id_zona: id,
        deleted: true,
    };
};

module.exports = deleteZonaService;