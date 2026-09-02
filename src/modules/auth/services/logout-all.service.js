const db = require('../../../database/models');

const { RefreshToken } = db;

const logoutAllService = async ({
    id_usuario,
}) => {
    const [closedSessions] =
        await RefreshToken.update(
            {
                estado: false,
                fecha_revocacion: new Date(),
            },
            {
                where: {
                    id_usuario,
                    estado: true,
                    fecha_revocacion: null,
                },
            },
        );

    return {
        session_closed: true,
        closed_sessions: closedSessions,
    };
};

module.exports = logoutAllService;