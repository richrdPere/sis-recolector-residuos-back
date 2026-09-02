const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    getTokenExpirationDate,
} = require('../../../config/token');

const {
    Usuario,
    Roles,
    RefreshToken,
    sequelize,
} = db;

const refreshSessionService = async ({
    refresh_token,
    ip = null,
    user_agent = null,
    dispositivo = null,
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

    const storedToken = await RefreshToken.findOne({
        where: {
            id_usuario: payload.id_usuario,
            jti: payload.session_id,
            token_hash: hashToken(refresh_token),
            estado: true,
            fecha_revocacion: null,
        },
    });

    if (!storedToken) {
        throw new AppError(
            'La sesión no existe, fue revocada o ya fue renovada.',
            401,
            'SESSION_NOT_FOUND',
        );
    }

    if (
        new Date(storedToken.fecha_expiracion) <=
        new Date()
    ) {
        await storedToken.update({
            estado: false,
            fecha_revocacion: new Date(),
        });

        throw new AppError(
            'La sesión ha expirado.',
            401,
            'SESSION_EXPIRED',
        );
    }

    const usuario = await Usuario.findByPk(
        payload.id_usuario,
        {
            attributes: [
                'id_usuario',
                'id_persona',
                'email_acceso',
                'username',
                'estado',
            ],

            include: [
                {
                    association: 'persona',

                    attributes: [
                        'id_persona',
                        'nombres',
                        'apellidos',
                        'celular',
                        'foto_url',
                        'estado',
                    ],
                },

                {
                    model: Roles,
                    as: 'roles',

                    attributes: [
                        'id_rol',
                        'nombre',
                        'descripcion',
                    ],

                    where: {
                        estado: true,
                    },

                    through: {
                        where: {
                            estado: true,
                        },
                        attributes: [],
                    },

                    required: false,
                },
            ],
        },
    );

    if (!usuario || !usuario.estado) {
        throw new AppError(
            'El usuario no existe o se encuentra inactivo.',
            403,
            'USER_INACTIVE',
        );
    }

    if (!usuario.persona?.estado) {
        throw new AppError(
            'El perfil del usuario está inactivo.',
            403,
            'PERSON_INACTIVE',
        );
    }

    if (!usuario.roles?.length) {
        throw new AppError(
            'El usuario no tiene roles activos.',
            403,
            'USER_WITHOUT_ACTIVE_ROLE',
        );
    }

    const roleNames = usuario.roles.map(
        (rol) => rol.nombre,
    );

    /*
    |--------------------------------------------------------------------------
    | Rotación del refresh token
    |--------------------------------------------------------------------------
    */

    const newAccessToken = generateAccessToken({
        usuario,
        roles: roleNames,
        sessionId: payload.session_id,
    });

    const newRefreshToken = generateRefreshToken({
        usuario,
        sessionId: payload.session_id,
    });

    const transaction =
        await sequelize.transaction();

    try {
        await storedToken.update(
            {
                token_hash: hashToken(newRefreshToken),
                fecha_expiracion:
                    getTokenExpirationDate(newRefreshToken),
                ip,
                user_agent,
                dispositivo:
                    dispositivo ||
                    storedToken.dispositivo,
            },
            {
                transaction,
            },
        );

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }

    return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in:
            process.env.JWT_ACCESS_EXPIRES || '30m',
    };
};

module.exports = refreshSessionService;
