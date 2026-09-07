// validations/codigo-qr.validation.js

const AppError =
    require(
        '../../../utils/app-error',
    );

const QR_RESOURCE_TYPES = [
    'ZONA',
    'RUTA',
];

const QR_STATES = [
    'ACTIVO',
    'INACTIVO',
    'REVOCADO',
];

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

const validateResourceType = (
    value,
) => {
    const type =
        String(
            value || '',
        )
            .trim()
            .toUpperCase();

    if (
        !QR_RESOURCE_TYPES.includes(
            type,
        )
    ) {
        throw new AppError(
            'El tipo de recurso del código QR no es válido.',
            400,
            'INVALID_QR_RESOURCE_TYPE',
        );
    }

    return type;
};

const validateQrState = (
    value,
) => {
    const state =
        String(
            value || '',
        )
            .trim()
            .toUpperCase();

    if (
        !QR_STATES.includes(
            state,
        )
    ) {
        throw new AppError(
            'El estado del código QR no es válido.',
            400,
            'INVALID_QR_STATE',
        );
    }

    return state;
};

const validateToken = (
    value,
) => {
    const token =
        String(
            value || '',
        ).trim();

    if (
        !/^[a-f0-9]{64}$/i.test(
            token,
        )
    ) {
        throw new AppError(
            'El token público del código QR no es válido.',
            400,
            'INVALID_QR_TOKEN',
        );
    }

    return token;
};

const validateRequiredText = (
    value,
    field,
    maxLength,
) => {
    if (
        typeof value !==
        'string' ||
        !value.trim()
    ) {
        throw new AppError(
            `El campo ${field} es obligatorio.`,
            400,
            'REQUIRED_FIELD',
        );
    }

    const normalized =
        value.trim();

    if (
        normalized.length >
        maxLength
    ) {
        throw new AppError(
            `El campo ${field} no puede superar los ${maxLength} caracteres.`,
            400,
            'FIELD_TOO_LONG',
        );
    }

    return normalized;
};

module.exports = {
    QR_RESOURCE_TYPES,
    QR_STATES,
    validateId,
    validateResourceType,
    validateQrState,
    validateToken,
    validateRequiredText,
};