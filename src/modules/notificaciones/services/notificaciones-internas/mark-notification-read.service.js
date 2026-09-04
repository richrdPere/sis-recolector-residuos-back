// services/mark-notification-read.service.js

const db = require('../../../../database/models');

// Validations
const { validateId } = require('../../validations/notificacion.validation');

// Utils
const { getUserNotificationOrFail } = require('../../utils/notificacion-service.utils');

// Modelos
const {
    sequelize,
} = db;

// =======================================================
// Service: Marcar notificacion como leida
// =======================================================
const markNotificationReadService = async ({
    id_notificacion_usuario,
    id_usuario,
}) => {
    const notificationUserId =
        validateId(
            id_notificacion_usuario,
            'identificador de la notificación',
        );

    const userId =
        validateId(
            id_usuario,
            'identificador del usuario',
        );

    const transaction =
        await sequelize.transaction();

    try {
        const userNotification =
            await getUserNotificationOrFail({
                id_notificacion_usuario:
                    notificationUserId,

                id_usuario:
                    userId,

                transaction,
                lock:
                    true,
            });

        if (
            !userNotification.leida
        ) {
            await userNotification
                .update(
                    {
                        leida:
                            true,

                        fecha_leida:
                            new Date(),
                    },
                    {
                        transaction,
                    },
                );
        }

        await transaction
            .commit();

        return userNotification;
    } catch (error) {
        if (
            !transaction.finished
        ) {
            await transaction
                .rollback();
        }

        throw error;
    }
};

module.exports =
    markNotificationReadService;