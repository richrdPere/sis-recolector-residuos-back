const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    verifyRefreshToken,
    hashToken,
} = require('../../../config/token');

const { RefreshToken } = db;

const logoutService = async ({
    id_usuario,
    refresh_token,
}) => {
    if (!refresh_token) {
        throw new AppError(
            'El refresh token es obligatorio.',
            400,
            'REFRESH_TOKEN_REQUIRED',
        );
    }

    const payload =
        verifyRefreshToken(refresh_token);

    if (
        Number(payload.id_usuario) !==
        Number(id_usuario)
    ) {
        throw new AppError(
            'El token no pertenece al usuario autenticado.',
            403,
            'TOKEN_USER_MISMATCH',
        );
    }

    const storedToken = await RefreshToken.findOne({
        where: {
            id_usuario,
            jti: payload.session_id,
            token_hash: hashToken(refresh_token),
            estado: true,
            fecha_revocacion: null,
        },
    });

    if (!storedToken) {
        return {
            session_closed: true,
            already_closed: true,
        };
    }

    await storedToken.update({
        estado: false,
        fecha_revocacion: new Date(),
    });

    return {
        session_closed: true,
        already_closed: false,
    };
};

module.exports = logoutService;
