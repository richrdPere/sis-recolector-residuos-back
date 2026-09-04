const AppError = require('../../../utils/app-error');

const PLATFORMS = [
    'ANDROID',
    'IOS',
    'WEB',
];

const NOTIFICATION_PERMISSIONS = [
    'NO_SOLICITADO',
    'AUTORIZADO',
    'DENEGADO',
    'PROVISIONAL',
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

const normalizeRequiredText = (
    value,
    field,
    maximumLength,
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
    maximumLength,
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
        text.length >
        maximumLength
    ) {
        throw new AppError(
            `El texto no puede superar los ${maximumLength} caracteres.`,
            400,
            'TEXT_TOO_LONG',
        );
    }

    return text;
};

const normalizePlatform = (
    value,
) => {
    const platform =
        String(
            value || 'ANDROID',
        )
            .trim()
            .toUpperCase();

    if (
        !PLATFORMS.includes(
            platform,
        )
    ) {
        throw new AppError(
            'La plataforma del dispositivo no es válida.',
            400,
            'INVALID_DEVICE_PLATFORM',
        );
    }

    return platform;
};

const normalizePermission = (
    value,
) => {
    const permission =
        String(
            value ||
            'NO_SOLICITADO',
        )
            .trim()
            .toUpperCase();

    if (
        !NOTIFICATION_PERMISSIONS
            .includes(permission)
    ) {
        throw new AppError(
            'El estado del permiso de notificaciones no es válido.',
            400,
            'INVALID_NOTIFICATION_PERMISSION',
        );
    }

    return permission;
};

module.exports = {
    PLATFORMS,
    NOTIFICATION_PERMISSIONS,
    validateId,
    normalizeRequiredText,
    normalizeOptionalText,
    normalizePlatform,
    normalizePermission,
};