const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

const {
    validateSchedule,
    validateOverlap
} = require("../../utils/ruta-horario/ruta-horario.utils");

// Modelos
const {
    Ruta,
    RutaHorario,
} = db;

// ===============================================
// SERVICE: Crear ruta horario
// ===============================================
const createRutaHorarioService = async (
    idRuta,
    {
        dia_semana,
        hora_inicio,
        hora_fin,
        frecuencia =
        'SEMANAL',
        fecha_vigencia_desde,
        fecha_vigencia_hasta =
        null,
        observacion = null,
    },
) => {
    const routeId =
        validateId(
            idRuta,
            'identificador de la ruta',
        );

    const ruta =
        await Ruta.findByPk(
            routeId,
        );

    if (!ruta) {
        throw new AppError(
            'La ruta no fue encontrada.',
            404,
            'ROUTE_NOT_FOUND',
        );
    }

    const data = {
        dia_semana,
        hora_inicio,
        hora_fin,
        frecuencia,
        fecha_vigencia_desde,
        fecha_vigencia_hasta,
    };

    validateSchedule(data);

    await validateOverlap(
        routeId,
        data,
    );

    return RutaHorario.create({
        id_ruta: routeId,
        ...data,

        observacion:
            observacion?.trim() ||
            null,

        estado: true,
    });
};

module.exports = createRutaHorarioService;