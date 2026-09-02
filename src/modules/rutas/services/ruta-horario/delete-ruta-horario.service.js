const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');


// Modelos
const { RutaHorario } = db;

// ===============================================
// SERVICE: Eliminar ruta horario
// ===============================================
const deleteRutaHorarioService = async (
    idRuta,
    idHorario,
) => {
    const routeId =
        validateId(
            idRuta,
            'identificador de la ruta',
        );

    const scheduleId =
        validateId(
            idHorario,
            'identificador del horario',
        );

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

    await horario.destroy();

    return {
        id_ruta_horario:
            scheduleId,

        deleted: true,
    };
};

module.exports = deleteRutaHorarioService;