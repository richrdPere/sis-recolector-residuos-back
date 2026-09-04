// services/mark-all-notifications-read.service.js

const db = require('../../../../database/models');

// Validations
const {
    validateId,
} = require(
    '../../validations/notificacion.validation',
);

// Modelos
const { NotificacionUsuario } = db;

// =======================================================
// Service: Marcar todas las notificaciones como leida
// =======================================================
const markAllNotificationsReadService = async (idUsuario) => {
    const userId =
        validateId(
            idUsuario,
            'identificador del usuario',
        );

    const [
        affectedRows,
    ] =
        await NotificacionUsuario
            .update(
                {
                    leida:
                        true,

                    fecha_leida:
                        new Date(),
                },
                {
                    where: {
                        id_usuario:
                            userId,

                        leida:
                            false,

                        archivada:
                            false,
                    },
                },
            );

    return {
        actualizadas:
            affectedRows,
    };
};

module.exports = markAllNotificationsReadService;