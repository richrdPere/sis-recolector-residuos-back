const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Validation
const { validateId } = require('../../validations/dispositivo.validation');

// Modelos
const {
    UsuarioDispositivo,
    sequelize,
} = db;

// =======================================================
// Service: Desactivar un dispositivo
// =======================================================
const deactivateDeviceService = async (idDispositivo, {
    id_usuario,
    motivo =
    'Dispositivo desactivado por el usuario.',
},
) => {
    const deviceId =
        validateId(
            idDispositivo,
            'identificador del dispositivo',
        );

    const userId =
        validateId(
            id_usuario,
            'identificador del usuario',
        );

    const transaction =
        await sequelize.transaction();

    try {
        const device =
            await UsuarioDispositivo
                .findOne({
                    where: {
                        id_dispositivo:
                            deviceId,

                        id_usuario:
                            userId,
                    },

                    transaction,

                    lock:
                        transaction
                            .LOCK.UPDATE,
                });

        if (!device) {
            throw new AppError(
                'El dispositivo no fue encontrado para el usuario autenticado.',
                404,
                'USER_DEVICE_NOT_FOUND',
            );
        }

        if (
            device
                .estado_dispositivo !==
            'ACTIVO'
        ) {
            await transaction
                .commit();

            return {
                id_dispositivo:
                    device
                        .id_dispositivo,

                estado_dispositivo:
                    device
                        .estado_dispositivo,

                desactivado:
                    false,

                ya_estaba_desactivado:
                    true,
            };
        }

        await device.update(
            {
                token_push:
                    null,

                estado_dispositivo:
                    'INACTIVO',

                fecha_desactivacion:
                    new Date(),

                motivo_desactivacion:
                    String(
                        motivo ||
                        'Dispositivo desactivado por el usuario.',
                    )
                        .trim()
                        .slice(
                            0,
                            500,
                        ),
            },
            {
                transaction,
            },
        );

        await transaction.commit();

        return {
            id_dispositivo:
                device
                    .id_dispositivo,

            estado_dispositivo:
                device
                    .estado_dispositivo,

            desactivado:
                true,

            ya_estaba_desactivado:
                false,
        };
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

module.exports = deactivateDeviceService;