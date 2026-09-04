const AppError = require('../../../utils/app-error');

const getAuthenticatedUserId = (
    req,
) => {
    const idUsuario =
        req.usuario?.id_usuario ??
        req.usuario?.id ??
        null;

    if (!idUsuario) {
        throw new AppError(
            'No se pudo identificar al usuario autenticado.',
            401,
            'AUTHENTICATED_USER_NOT_FOUND',
        );
    }

    return idUsuario;
};

const getRequestMetadata = (
    req,
) => {
    const forwardedFor =
        req.headers[
        'x-forwarded-for'
        ];

    const forwardedIp =
        typeof forwardedFor ===
            'string'
            ? forwardedFor
                .split(',')[0]
                .trim()
            : null;

    return {
        id_usuario:
            getAuthenticatedUserId(
                req,
            ),

        ip:
            forwardedIp ||
            req.ip ||
            req.socket
                ?.remoteAddress ||
            null,

        user_agent:
            req.get(
                'user-agent',
            ) || null,
    };
};

module.exports = {
    getAuthenticatedUserId,
    getRequestMetadata,
};