const db = require('../../../../database/models');

// Validations
const { normalizeRequiredText } = require('../../validations/dispositivo.validation');

// Modelos
const {
  UsuarioDispositivo,
} = db;

// =======================================================
// Service: Revocar token invalido desde el sistema
// =======================================================
const revokeInvalidTokenService = async (tokenPush,
  {
    motivo =
    'El proveedor push reportó que el token ya no es válido.',
    transaction = null,
  } = {},
) => {
  const pushToken =
    normalizeRequiredText(
      tokenPush,
      'token push',
      512,
    );

  const device =
    await UsuarioDispositivo
      .findOne({
        where: {
          token_push:
            pushToken,
        },

        transaction,
      });

  if (!device) {
    return {
      revocado:
        false,

      dispositivo:
        null,
    };
  }

  await device.update(
    {
      token_push:
        null,

      estado_dispositivo:
        'REVOCADO',

      fecha_desactivacion:
        new Date(),

      motivo_desactivacion:
        String(motivo)
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

  return {
    revocado:
      true,

    dispositivo: {
      id_dispositivo:
        device
          .id_dispositivo,

      id_usuario:
        device
          .id_usuario,

      estado_dispositivo:
        device
          .estado_dispositivo,
    },
  };
};

module.exports = revokeInvalidTokenService;