const AppError =
    require(
        '../../../utils/app-error',
    );

const PRIORITIES = [
    'BAJA',
    'NORMAL',
    'ALTA',
    'URGENTE',
];

const ALLOWED_ORIGINS = [
    'WEB',
    'MOVIL',
    'SISTEMA',
    'API',
];

const validateId = (
    value,
    field = 'identificador',
) => {
    const id =
        Number(value);

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

const validateOptionalId = (
    value,
    field = 'identificador',
) => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    return validateId(
        value,
        field,
    );
};

const normalizeRequiredText = (
    value,
    field,
    maximumLength = null,
) => {
    const text =
        String(
            value || '',
        ).trim();

    if (!text) {
        throw new AppError(
            `El campo ${field} es obligatorio.`,
            400,
            'REQUIRED_FIELD',
        );
    }

    if (
        maximumLength &&
        text.length >
        maximumLength
    ) {
        throw new AppError(
            `El campo ${field} no puede superar los ${maximumLength} caracteres.`,
            400,
            'TEXT_TOO_LONG',
        );
    }

    return text;
};

const normalizeOptionalText = (
    value,
    field,
    maximumLength = null,
) => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    const text =
        String(value).trim();

    if (!text) {
        return null;
    }

    if (
        maximumLength &&
        text.length >
        maximumLength
    ) {
        throw new AppError(
            `El campo ${field} no puede superar los ${maximumLength} caracteres.`,
            400,
            'TEXT_TOO_LONG',
        );
    }

    return text;
};

const normalizeDate = (
    value,
    field,
) => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new AppError(
            `El campo ${field} no contiene una fecha válida.`,
            400,
            'INVALID_DATE',
        );
    }

    return date;
};

const normalizePriority = (
    value = 'NORMAL',
) => {
    const priority =
        String(
            value || 'NORMAL',
        )
            .trim()
            .toUpperCase();

    if (
        !PRIORITIES.includes(
            priority,
        )
    ) {
        throw new AppError(
            'La prioridad de la notificación no es válida.',
            400,
            'INVALID_NOTIFICATION_PRIORITY',
        );
    }

    return priority;
};

const normalizeOrigin = (
    value = 'SISTEMA',
) => {
    const origin =
        String(
            value || 'SISTEMA',
        )
            .trim()
            .toUpperCase();

    if (
        !ALLOWED_ORIGINS.includes(
            origin,
        )
    ) {
        throw new AppError(
            'El origen de la notificación no es válido.',
            400,
            'INVALID_NOTIFICATION_ORIGIN',
        );
    }

    return origin;
};

const normalizeBooleanQuery = (
    value,
    field,
) => {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null;
    }

    if (
        value === true ||
        value === 'true' ||
        value === '1' ||
        value === 1
    ) {
        return true;
    }

    if (
        value === false ||
        value === 'false' ||
        value === '0' ||
        value === 0
    ) {
        return false;
    }

    throw new AppError(
        `El campo ${field} debe ser true o false.`,
        400,
        'INVALID_BOOLEAN',
    );
};

module.exports = {
    PRIORITIES,
    ALLOWED_ORIGINS,
    validateId,
    validateOptionalId,
    normalizeRequiredText,
    normalizeOptionalText,
    normalizeDate,
    normalizePriority,
    normalizeOrigin,
    normalizeBooleanQuery,
};