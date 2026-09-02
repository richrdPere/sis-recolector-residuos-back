const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

// Modelos
const {
    RutaHorario,
} = db;

// ===============================================
// SERVICE: Cambiar el estado de la ruta horario
// ===============================================
const changeRutaHorarioEstadoService = async ({
    id_ruta,
    id_horario,
    estado,
}) => {
    const routeId =
        validateId(
            id_ruta,
            'identificador de la ruta',
        );

    const scheduleId =
        validateId(
            id_horario,
            'identificador del horario',
        );

    if (
        typeof estado !==
        'boolean'
    ) {
        throw new AppError(
            'El estado debe ser verdadero o falso.',
            400,
            'INVALID_SCHEDULE_STATUS',
        );
    }

    const horario =
        await RutaHorario.findOne({
            where: {
                id_ruta_horario:
                    scheduleId,

                id_ruta: routeId,
            },
        });

    if (!horario) {
        throw new AppError(
            'El horario no fue encontrado.',
            404,
            'ROUTE_SCHEDULE_NOT_FOUND',
        );
    }

    if (
        horario.estado ===
        estado
    ) {
        throw new AppError(
            'El horario ya tiene el estado solicitado.',
            409,
            'SCHEDULE_STATUS_NOT_CHANGED',
        );
    }

    if (estado) {
        await validateOverlap(
            routeId,
            horario,
            scheduleId,
        );
    }

    await horario.update({
        estado,
    });

    return horario;
};

module.exports = changeRutaHorarioEstadoService;