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
// SERVICE: Obtener zona por id
// ===============================================
const getZonaByIdService = async (idZona) => {
    const id = validateId(
        idZona,
        'identificador de la zona',
    );

    const zona =
        await Zona.findByPk(id, {
            include: [
                {
                    model: Ruta,
                    as: 'rutas',
                    required: false,

                    attributes: [
                        'id_ruta',
                        'codigo',
                        'nombre',
                        'color',
                        'estado_ruta',
                        'estado',
                    ],
                },
            ],
        });

    if (!zona) {
        throw new AppError(
            'La zona no fue encontrada.',
            404,
            'ZONE_NOT_FOUND',
        );
    }

    return zona;
};

module.exports = getZonaByIdService;