const AppError = require('../../../utils/app-error');

const {
    DIAS_SEMANA,
    FUNCIONES_PERSONAL,
} = require('../utils/programacion.constans');

/*
|--------------------------------------------------------------------------
| Validar identificador
|--------------------------------------------------------------------------
*/

const validateId = (
    value,
    field = 'identificador',
) => {
    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new AppError(
            `El ${field} no es válido.`,
            400,
            'INVALID_ID',
        );
    }

    return id;
};

/*
|--------------------------------------------------------------------------
| Convertir una hora a segundos
|--------------------------------------------------------------------------
|
| Permite los formatos HH:mm y HH:mm:ss.
|
*/

const timeToSeconds = (
    time,
) => {
    const normalizedTime =
        String(time || '').trim();

    const match =
        normalizedTime.match(
            /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
        );

    if (!match) {
        throw new AppError(
            'El formato de la hora no es válido.',
            400,
            'INVALID_TIME_FORMAT',
        );
    }

    const hours =
        Number(match[1]);

    const minutes =
        Number(match[2]);

    const seconds =
        Number(match[3] || 0);

    return (
        hours * 3600 +
        minutes * 60 +
        seconds
    );
};

/*
|--------------------------------------------------------------------------
| Validar fecha ISO
|--------------------------------------------------------------------------
*/

const validateDateOnly = (
    date,
    field = 'fecha',
) => {
    const normalizedDate =
        String(date || '').trim();

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            normalizedDate,
        )
    ) {
        throw new AppError(
            `La ${field} no tiene un formato válido.`,
            400,
            'INVALID_DATE_FORMAT',
        );
    }

    const parsedDate =
        new Date(
            `${normalizedDate}T00:00:00Z`,
        );

    if (
        Number.isNaN(
            parsedDate.getTime(),
        ) ||
        parsedDate
            .toISOString()
            .slice(0, 10) !==
        normalizedDate
    ) {
        throw new AppError(
            `La ${field} no es válida.`,
            400,
            'INVALID_DATE',
        );
    }

    return normalizedDate;
};

/*
|--------------------------------------------------------------------------
| Validar ventana de programación
|--------------------------------------------------------------------------
*/

const validateProgrammingWindow = ({
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
}) => {
    if (
        !fecha_programada ||
        !hora_inicio_programada ||
        !hora_fin_programada
    ) {
        throw new AppError(
            'La fecha, hora inicial y hora final son obligatorias.',
            400,
            'PROGRAMMING_WINDOW_REQUIRED',
        );
    }

    validateDateOnly(
        fecha_programada,
        'fecha programada',
    );

    const startSeconds =
        timeToSeconds(
            hora_inicio_programada,
        );

    const endSeconds =
        timeToSeconds(
            hora_fin_programada,
        );

    if (
        endSeconds <=
        startSeconds
    ) {
        throw new AppError(
            'La hora final debe ser posterior a la hora inicial.',
            400,
            'INVALID_PROGRAMMING_TIME',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Obtener día de la semana
|--------------------------------------------------------------------------
*/

const getWeekDay = (
    date,
) => {
    const normalizedDate =
        validateDateOnly(
            date,
            'fecha programada',
        );

    const parsedDate =
        new Date(
            `${normalizedDate}T00:00:00Z`,
        );

    return DIAS_SEMANA[
        parsedDate.getUTCDay()
    ];
};

/*
|--------------------------------------------------------------------------
| Validar función del personal
|--------------------------------------------------------------------------
*/

const validatePersonalFunction = (
    funcion,
) => {
    const normalizedFunction =
        String(funcion || '')
            .trim()
            .toUpperCase();

    if (
        !FUNCIONES_PERSONAL.includes(
            normalizedFunction,
        )
    ) {
        throw new AppError(
            'La función del personal no es válida.',
            400,
            'INVALID_PERSONAL_FUNCTION',
        );
    }

    return normalizedFunction;
};

/*
|--------------------------------------------------------------------------
| Verificar que un horario aplique en una fecha
|--------------------------------------------------------------------------
*/

const scheduleAppliesToDate = (
    schedule,
    date,
) => {
    const programmedDate =
        validateDateOnly(
            date,
            'fecha programada',
        );

    const startDate =
        String(
            schedule.fecha_vigencia_desde,
        ).slice(0, 10);

    const endDate =
        schedule.fecha_vigencia_hasta
            ? String(
                schedule.fecha_vigencia_hasta,
            ).slice(0, 10)
            : null;

    if (
        programmedDate <
        startDate
    ) {
        return false;
    }

    if (
        endDate &&
        programmedDate >
        endDate
    ) {
        return false;
    }

    if (
        schedule.frecuencia ===
        'SEMANAL'
    ) {
        return true;
    }

    const start =
        new Date(
            `${startDate}T00:00:00Z`,
        );

    const programmed =
        new Date(
            `${programmedDate}T00:00:00Z`,
        );

    const differenceDays =
        Math.floor(
            (
                programmed.getTime() -
                start.getTime()
            ) /
            86400000,
        );

    if (
        schedule.frecuencia ===
        'QUINCENAL'
    ) {
        const weeks =
            Math.floor(
                differenceDays / 7,
            );

        return weeks % 2 === 0;
    }

    if (
        schedule.frecuencia ===
        'MENSUAL'
    ) {
        return (
            programmed.getUTCDate() ===
            start.getUTCDate()
        );
    }

    if (
        schedule.frecuencia ===
        'ESPECIAL'
    ) {
        return (
            programmedDate ===
            startDate
        );
    }

    return false;
};

module.exports = {
    validateId,
    validateDateOnly,
    timeToSeconds,
    validateProgrammingWindow,
    validatePersonalFunction,
    getWeekDay,
    scheduleAppliesToDate,
};