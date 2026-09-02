const { Op } = require('sequelize');
const AppError = require('../../../../utils/app-error');
const db = require('../../../../database/models');

// Modelos
const { RutaHorario } = db;

const DIAS = [
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO',
];

const FRECUENCIAS = [
    'SEMANAL',
    'QUINCENAL',
    'MENSUAL',
    'ESPECIAL',
];

const rangesOverlap = (first, second) => {
    const firstEnd =
        first.fecha_vigencia_hasta ||
        '9999-12-31';

    const secondEnd =
        second.fecha_vigencia_hasta ||
        '9999-12-31';

    const dateOverlap =
        first
            .fecha_vigencia_desde <=
        secondEnd &&
        second
            .fecha_vigencia_desde <=
        firstEnd;

    const timeOverlap =
        first.hora_inicio <
        second.hora_fin &&
        second.hora_inicio <
        first.hora_fin;

    return (
        dateOverlap &&
        timeOverlap
    );
};

const validateSchedule = (
    data,
) => {
    if (
        !DIAS.includes(
            data.dia_semana,
        )
    ) {
        throw new AppError(
            'El día de la semana no es válido.',
            400,
            'INVALID_WEEKDAY',
        );
    }

    if (
        !FRECUENCIAS.includes(
            data.frecuencia,
        )
    ) {
        throw new AppError(
            'La frecuencia no es válida.',
            400,
            'INVALID_SCHEDULE_FREQUENCY',
        );
    }

    if (
        !data.hora_inicio ||
        !data.hora_fin ||
        data.hora_fin <=
        data.hora_inicio
    ) {
        throw new AppError(
            'La hora final debe ser posterior a la hora inicial.',
            400,
            'INVALID_SCHEDULE_TIME',
        );
    }

    if (
        !data.fecha_vigencia_desde
    ) {
        throw new AppError(
            'La fecha inicial de vigencia es obligatoria.',
            400,
            'SCHEDULE_START_DATE_REQUIRED',
        );
    }

    if (
        data.fecha_vigencia_hasta &&
        data.fecha_vigencia_hasta <
        data.fecha_vigencia_desde
    ) {
        throw new AppError(
            'La fecha final no puede ser anterior a la fecha inicial.',
            400,
            'INVALID_SCHEDULE_DATES',
        );
    }
};

const validateOverlap = async (
    idRuta,
    data,
    excludeId = null,
) => {
    const where = {
        id_ruta: idRuta,
        dia_semana:
            data.dia_semana,
        estado: true,
    };

    if (excludeId) {
        where.id_ruta_horario = {
            [Op.ne]: excludeId,
        };
    }

    const schedules =
        await RutaHorario.findAll
            ({
                where,
            });

    const overlapping =
        schedules.some(
            (schedule) =>
                rangesOverlap(
                    data,
                    schedule,
                ),
        );

    if (overlapping) {
        throw new AppError(
            'El horario se superpone con otro horario activo de la ruta.',
            409,
            'ROUTE_SCHEDULE_OVERLAP',
        );
    }
};


module.exports = {
    validateSchedule,
    validateOverlap
}