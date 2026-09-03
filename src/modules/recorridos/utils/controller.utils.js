/*
|--------------------------------------------------------------------------
| Obtener ID del usuario autenticado
|--------------------------------------------------------------------------
*/

const getAuthenticatedUserId = (
    req,
) => {
    return (
        req.usuario?.id_usuario ||
        req.usuario?.id ||
        null
    );
};

/*
|--------------------------------------------------------------------------
| Obtener metadatos del request
|--------------------------------------------------------------------------
*/

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

    const requestedOrigin =
        String(
            req.get(
                'x-client-origin',
            ) || 'APP',
        )
            .trim()
            .toUpperCase();

    const allowedOrigins = [
        'WEB',
        'APP',
        'SISTEMA',
    ];

    return {
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

        origen:
            allowedOrigins.includes(
                requestedOrigin,
            )
                ? requestedOrigin
                : 'APP',
    };
};

module.exports = {
    getAuthenticatedUserId,
    getRequestMetadata,
};