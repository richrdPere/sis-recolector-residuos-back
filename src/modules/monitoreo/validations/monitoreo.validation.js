const AppError = require('../../../utils/app-error');

const {
    PROGRAMMING_STATES,
    ROUTE_STATES,
    ALERT_LEVELS,
} = require('../utils/monitoreo.constants');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const validateId = (
    value,
    field = 'identificador',
    { required = true } = {},
) => {
    if (
        !required &&
        (value === undefined || value === null || value === '')
    ) {
        return null;
    }

    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError(
            `El ${field} no es válido.`,
            400,
            'INVALID_ID',
        );
    }

    return id;
};

const validateDate = (
    value,
    field = 'fecha',
    { required = true } = {},
) => {
    if (!required && !value) {
        return null;
    }

    const normalized = String(value || '').trim();

    if (!DATE_PATTERN.test(normalized)) {
        throw new AppError(
            `La ${field} debe tener el formato YYYY-MM-DD.`,
            400,
            'INVALID_DATE',
        );
    }

    const date = new Date(`${normalized}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== normalized
    ) {
        throw new AppError(
            `La ${field} no es válida.`,
            400,
            'INVALID_DATE',
        );
    }

    return normalized;
};

const validateEnum = (
    value,
    allowedValues,
    field,
    { required = false } = {},
) => {
    if (
        !required &&
        (value === undefined || value === null || value === '')
    ) {
        return null;
    }

    const normalized = String(value || '')
        .trim()
        .toUpperCase();

    if (!allowedValues.includes(normalized)) {
        throw new AppError(
            `El valor de ${field} no es válido.`,
            400,
            'INVALID_FILTER',
            {
                field,
                allowed_values: allowedValues,
            },
        );
    }

    return normalized;
};

const validateBoolean = (value, field) => {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    if (typeof value === 'boolean') {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();

    if (normalized === 'true' || normalized === '1') {
        return true;
    }

    if (normalized === 'false' || normalized === '0') {
        return false;
    }

    throw new AppError(
        `El valor de ${field} debe ser booleano.`,
        400,
        'INVALID_BOOLEAN',
    );
};

const normalizePagination = ({
    page = 1,
    limit = 20,
} = {}) => {
    const normalizedPage = Math.max(Number(page) || 1, 1);
    const normalizedLimit = Math.min(
        Math.max(Number(limit) || 20, 1),
        100,
    );

    return {
        page: normalizedPage,
        limit: normalizedLimit,
        offset: (normalizedPage - 1) * normalizedLimit,
    };
};

const validateMonitorFilters = (filters = {}) => ({
    fecha: validateDate(
        filters.fecha || new Date().toISOString().slice(0, 10),
        'fecha de consulta',
    ),

    id_zona: validateId(
        filters.id_zona,
        'identificador de la zona',
        { required: false },
    ),

    id_ruta: validateId(
        filters.id_ruta,
        'identificador de la ruta',
        { required: false },
    ),

    id_vehiculo: validateId(
        filters.id_vehiculo,
        'identificador del vehículo',
        { required: false },
    ),

    estado_programacion: validateEnum(
        filters.estado_programacion,
        PROGRAMMING_STATES,
        'estado_programacion',
    ),

    estado_recorrido: validateEnum(
        filters.estado_recorrido,
        ROUTE_STATES,
        'estado_recorrido',
    ),

    solo_alertas: validateBoolean(
        filters.solo_alertas,
        'solo_alertas',
    ),
});

const validateAlertFilters = (filters = {}) => ({
    ...validateMonitorFilters(filters),

    nivel: validateEnum(
        filters.nivel,
        ALERT_LEVELS,
        'nivel',
    ),
});

module.exports = {
    validateId,
    validateDate,
    validateEnum,
    validateBoolean,
    normalizePagination,
    validateMonitorFilters,
    validateAlertFilters,
};