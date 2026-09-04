const db = require('../../../../database/models');

// Validation
const {
  validateId,
  normalizeRequiredText
} = require('../../validations/dispositivo.validation');

// Modelos
const {
  UsuarioDispositivo,
  sequelize,
} = db;

// =======================================================
// Service: Desactivar un dispositivo por token
// =======================================================
const deactivateDeviceByTokenService = async (
  {
    token_push,
  },
  {
    id_usuario,
  },
) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const pushToken =
    normalizeRequiredText(
      token_push,
      'token push',
      512,
    );

  const transaction =
    await sequelize.transaction();

  try {
    const device =
      await UsuarioDispositivo
        .findOne({
          where: {
            id_usuario:
              userId,

            token_push:
              pushToken,
          },

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

    /*
    | La operación es idempotente. Si el token ya fue
    | desactivado, se considera completada.
    */

    if (!device) {
      await transaction
        .commit();

      return {
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
          'Token desactivado durante el cierre de sesión.',
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

module.exports = deactivateDeviceByTokenService;