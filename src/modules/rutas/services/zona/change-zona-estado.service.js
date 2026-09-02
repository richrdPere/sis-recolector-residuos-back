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
// SERVICE: Change zonas
// ===============================================
const changeZonaEstadoService = async ({
    id_zona,
    estado,
}) => {
    const id = validateId(
        id_zona,
        'identificador de la zona',
    );

    if (
        typeof estado !==
        'boolean'
    ) {
        throw new AppError(
            'El estado debe ser verdadero o falso.',
            400,
            'INVALID_ZONE_STATUS',
        );
    }

    const zona =
        await Zona.findByPk(id);

    if (!zona) {
        throw new AppError(
            'La zona no fue encontrada.',
            404,
            'ZONE_NOT_FOUND',
        );
    }

    if (
        zona.estado === estado
    ) {
        throw new AppError(
            'La zona ya tiene el estado solicitado.',
            409,
            'ZONE_STATUS_NOT_CHANGED',
        );
    }

    if (!estado) {
        const activeRoutes =
            await Ruta.count({
                where: {
                    id_zona: id,
                    estado: true,
                    estado_ruta:
                        'ACTIVA',
                },
            });

        if (activeRoutes > 0) {
            throw new AppError(
                'No se puede desactivar una zona con rutas activas.',
                409,
                'ZONE_HAS_ACTIVE_ROUTES',
            );
        }
    }

    await zona.update({
        estado,
    });

    return zona;
};

module.exports = changeZonaEstadoService;