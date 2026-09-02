const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AppError = require('../utils/app-error');

/*
|--------------------------------------------------------------------------
| Configuración
|--------------------------------------------------------------------------
*/
const getAccessSecret = () => {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
        throw new AppError(
            'No se configuró JWT_ACCESS_SECRET.',
            500,
            'JWT_ACCESS_SECRET_NOT_CONFIGURED',
        );
    }

    return secret;
};

const getRefreshSecret = () => {
    const secret = process.env.JWT_REFRESH_SECRET;

    if (!secret) {
        throw new AppError(
            'No se configuró JWT_REFRESH_SECRET.',
            500,
            'JWT_REFRESH_SECRET_NOT_CONFIGURED',
        );
    }

    return secret;
};

const getIssuer = () => {
    return (
        process.env.JWT_ISSUER ||
        'backend-recoleccion-residuos'
    );
};

const getAudience = () => {
    return (
        process.env.JWT_AUDIENCE ||
        'recoleccion-residuos-clients'
    );
};

/*
|--------------------------------------------------------------------------
| Generar identificador único de sesión
|--------------------------------------------------------------------------
*/
const generateSessionId = () => {
    return crypto.randomUUID();
};

/*
|--------------------------------------------------------------------------
| Normalizar nombres de roles
|--------------------------------------------------------------------------
*/
const normalizeRoles = (roles = []) => {
    if (!Array.isArray(roles)) {
        return [];
    }

    return [
        ...new Set(
            roles
                .map((rol) => {
                    if (typeof rol === 'string') {
                        return rol;
                    }

                    return rol?.nombre;
                })
                .filter(Boolean)
                .map((nombre) => {
                    return String(nombre)
                        .trim()
                        .toUpperCase();
                }),
        ),
    ];
};

/*
|--------------------------------------------------------------------------
| Generar access token
|--------------------------------------------------------------------------
*/
const generateAccessToken = ({
    usuario,
    roles = [],
    sessionId,
}) => {
    if (!usuario?.id_usuario) {
        throw new AppError(
            'No se proporcionó un usuario válido para generar el token.',
            500,
            'INVALID_TOKEN_USER',
        );
    }

    if (!sessionId) {
        throw new AppError(
            'No se proporcionó el identificador de sesión.',
            500,
            'SESSION_ID_REQUIRED',
        );
    }

    const normalizedRoles = normalizeRoles(roles);

    const payload = {
        id_usuario: usuario.id_usuario,
        id_persona: usuario.id_persona,
        username: usuario.username,
        roles: normalizedRoles,
        session_id: sessionId,
        token_type: 'access',
    };

    return jwt.sign(
        payload,
        getAccessSecret(),
        {
            subject: String(usuario.id_usuario),

            expiresIn:
                process.env.JWT_ACCESS_EXPIRES || '30m',

            issuer: getIssuer(),
            audience: getAudience(),
        },
    );
};

/*
|--------------------------------------------------------------------------
| Generar refresh token
|--------------------------------------------------------------------------
*/
const generateRefreshToken = ({
    usuario,
    sessionId,
}) => {
    if (!usuario?.id_usuario) {
        throw new AppError(
            'No se proporcionó un usuario válido para generar el refresh token.',
            500,
            'INVALID_REFRESH_TOKEN_USER',
        );
    }

    if (!sessionId) {
        throw new AppError(
            'No se proporcionó el identificador de sesión.',
            500,
            'SESSION_ID_REQUIRED',
        );
    }

    const payload = {
        id_usuario: usuario.id_usuario,
        session_id: sessionId,
        token_type: 'refresh',
    };

    return jwt.sign(
        payload,
        getRefreshSecret(),
        {
            subject: String(usuario.id_usuario),
            jwtid: sessionId,

            expiresIn:
                process.env.JWT_REFRESH_EXPIRES || '30d',

            issuer: getIssuer(),
            audience: getAudience(),
        },
    );
};

/*
|--------------------------------------------------------------------------
| Generar pareja de tokens
|--------------------------------------------------------------------------
*/
const generateAuthTokens = ({
    usuario,
    roles = [],
    sessionId = null,
}) => {
    const currentSessionId =
        sessionId || generateSessionId();

    const accessToken = generateAccessToken({
        usuario,
        roles,
        sessionId: currentSessionId,
    });

    const refreshToken = generateRefreshToken({
        usuario,
        sessionId: currentSessionId,
    });

    return {
        accessToken,
        refreshToken,
        sessionId: currentSessionId,
        accessTokenExpiresIn:
            process.env.JWT_ACCESS_EXPIRES || '30m',
        refreshTokenExpiresIn:
            process.env.JWT_REFRESH_EXPIRES || '30d',
    };
};

/*
|--------------------------------------------------------------------------
| Verificar access token
|--------------------------------------------------------------------------
*/
const verifyAccessToken = (accessToken) => {
    if (!accessToken) {
        throw new AppError(
            'El token de acceso es obligatorio.',
            401,
            'ACCESS_TOKEN_REQUIRED',
        );
    }

    try {
        const payload = jwt.verify(
            accessToken,
            getAccessSecret(),
            {
                issuer: getIssuer(),
                audience: getAudience(),
            },
        );

        if (payload.token_type !== 'access') {
            throw new AppError(
                'El token proporcionado no es un access token.',
                401,
                'INVALID_ACCESS_TOKEN_TYPE',
            );
        }

        if (!payload.id_usuario) {
            throw new AppError(
                'El token no contiene un usuario válido.',
                401,
                'INVALID_ACCESS_TOKEN_PAYLOAD',
            );
        }

        return payload;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        if (error.name === 'TokenExpiredError') {
            throw new AppError(
                'El token de acceso ha expirado.',
                401,
                'ACCESS_TOKEN_EXPIRED',
            );
        }

        if (error.name === 'JsonWebTokenError') {
            throw new AppError(
                'El token de acceso no es válido.',
                401,
                'INVALID_ACCESS_TOKEN',
            );
        }

        if (error.name === 'NotBeforeError') {
            throw new AppError(
                'El token de acceso aún no está activo.',
                401,
                'ACCESS_TOKEN_NOT_ACTIVE',
            );
        }

        throw new AppError(
            'No se pudo verificar el token de acceso.',
            401,
            'ACCESS_TOKEN_VERIFICATION_ERROR',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Verificar refresh token
|--------------------------------------------------------------------------
*/
const verifyRefreshToken = (refreshToken) => {
    if (!refreshToken) {
        throw new AppError(
            'El refresh token es obligatorio.',
            401,
            'REFRESH_TOKEN_REQUIRED',
        );
    }

    try {
        const payload = jwt.verify(
            refreshToken,
            getRefreshSecret(),
            {
                issuer: getIssuer(),
                audience: getAudience(),
            },
        );

        if (payload.token_type !== 'refresh') {
            throw new AppError(
                'El token proporcionado no es un refresh token.',
                401,
                'INVALID_REFRESH_TOKEN_TYPE',
            );
        }

        if (!payload.id_usuario) {
            throw new AppError(
                'El refresh token no contiene un usuario válido.',
                401,
                'INVALID_REFRESH_TOKEN_PAYLOAD',
            );
        }

        if (!payload.session_id) {
            throw new AppError(
                'El refresh token no contiene una sesión válida.',
                401,
                'INVALID_REFRESH_SESSION',
            );
        }

        return payload;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }

        if (error.name === 'TokenExpiredError') {
            throw new AppError(
                'La sesión ha expirado.',
                401,
                'REFRESH_TOKEN_EXPIRED',
            );
        }

        if (error.name === 'JsonWebTokenError') {
            throw new AppError(
                'El refresh token no es válido.',
                401,
                'INVALID_REFRESH_TOKEN',
            );
        }

        if (error.name === 'NotBeforeError') {
            throw new AppError(
                'El refresh token aún no está activo.',
                401,
                'REFRESH_TOKEN_NOT_ACTIVE',
            );
        }

        throw new AppError(
            'No se pudo verificar el refresh token.',
            401,
            'REFRESH_TOKEN_VERIFICATION_ERROR',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Calcular hash de un token
|--------------------------------------------------------------------------
*/
const hashToken = (token) => {
    if (!token) {
        throw new AppError(
            'No se proporcionó el token para calcular su hash.',
            500,
            'TOKEN_REQUIRED_FOR_HASH',
        );
    }

    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
};

/*
|--------------------------------------------------------------------------
| Decodificar token sin verificar
|--------------------------------------------------------------------------
*/
const decodeToken = (token) => {
    if (!token) {
        throw new AppError(
            'El token es obligatorio.',
            400,
            'TOKEN_REQUIRED',
        );
    }

    const decoded = jwt.decode(token);

    if (!decoded) {
        throw new AppError(
            'No se pudo decodificar el token.',
            400,
            'TOKEN_DECODE_ERROR',
        );
    }

    return decoded;
};

/*
|--------------------------------------------------------------------------
| Obtener fecha de expiración
|--------------------------------------------------------------------------
*/
const getTokenExpirationDate = (token) => {
    const decoded = decodeToken(token);

    if (!decoded.exp) {
        throw new AppError(
            'El token no contiene una fecha de expiración.',
            500,
            'TOKEN_EXPIRATION_NOT_FOUND',
        );
    }

    return new Date(decoded.exp * 1000);
};

/*
|--------------------------------------------------------------------------
| Extraer Bearer token
|--------------------------------------------------------------------------
*/
const extractBearerToken = (
    authorizationHeader,
) => {
    if (!authorizationHeader) {
        throw new AppError(
            'No se proporcionó el encabezado de autorización.',
            401,
            'AUTHORIZATION_HEADER_REQUIRED',
        );
    }

    const parts = authorizationHeader
        .trim()
        .split(/\s+/);

    if (
        parts.length !== 2 ||
        parts[0].toLowerCase() !== 'bearer' ||
        !parts[1]
    ) {
        throw new AppError(
            'El encabezado de autorización no tiene el formato Bearer.',
            401,
            'INVALID_AUTHORIZATION_FORMAT',
        );
    }

    return parts[1];
};

module.exports = {
    generateSessionId,
    normalizeRoles,

    generateAccessToken,
    generateRefreshToken,
    generateAuthTokens,

    verifyAccessToken,
    verifyRefreshToken,

    hashToken,
    decodeToken,
    getTokenExpirationDate,
    extractBearerToken,
};