const AppError = require('../../../utils/app-error');

const getAuthenticatedUserId = (req) => {
    const idUsuario =
        req.usuario
            ?.id_usuario ||
        req.usuario?.id ||
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

const getClientIp = (req) => {
    const forwardedFor =
        req.headers[
        'x-forwarded-for'
        ];

    if (
        typeof forwardedFor ===
        'string'
    ) {
        return forwardedFor
            .split(',')[0]
            .trim();
    }

    return (
        req.ip ||
        req.socket
            ?.remoteAddress ||
        null
    );
};

const getPublicRequestMetadata = (req) => {
    return {
        ip:
            getClientIp(req),

        user_agent:
            req.get(
                'user-agent',
            ) || null,

        referer:
            req.get(
                'referer',
            ) || null,

        idioma:
            req.get(
                'accept-language',
            )
                ?.split(',')[0]
                ?.trim() ||
            null,
    };
};

module.exports = {
    getAuthenticatedUserId,
    getClientIp,
    getPublicRequestMetadata,
};