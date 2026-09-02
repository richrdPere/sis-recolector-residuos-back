const AppError = require(    '../../../utils/app-error');

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

const parseBoolean = (
    value,
    field = 'estado',
) => {
    if (
        value === true ||
        value === 'true' ||
        value === '1'
    ) {
        return true;
    }

    if (
        value === false ||
        value === 'false' ||
        value === '0'
    ) {
        return false;
    }

    throw new AppError(
        `El campo ${field} debe ser verdadero o falso.`,
        400,
        'INVALID_BOOLEAN_VALUE',
    );
};

const normalizeCode = (
    value,
) =>
    String(value || '')
        .trim()
        .toUpperCase();

const normalizeText = (
    value,
) =>
    String(value || '').trim();

const validateEnum = ({
    value,
    values,
    message,
    code,
}) => {
    if (!values.includes(value)) {
        throw new AppError(
            message,
            400,
            code,
        );
    }

    return value;
};

module.exports = {
    validateId,
    parseBoolean,
    normalizeCode,
    normalizeText,
    validateEnum,
};