const db = require('../../../../database/models');

// Validations
const {
  validateId,
  normalizeRequiredText,
  normalizeOptionalText,
  normalizePlatform,
  normalizePermission,
} = require('../../validations/dispositivo.validation');

// Modelos
const {
  UsuarioDispositivo,
  sequelize,
} = db;

// =======================================================
// Formar respuesta sin exponer el token completo
// =======================================================
const formatDevice = (
  device,
) => {
  const plainDevice =
    device.get
      ? device.get({
        plain:
          true,
      })
      : device;

  const {
    token_push,
    ...safeDevice
  } = plainDevice;

  return {
    ...safeDevice,

    token_registrado:
      Boolean(
        token_push,
      ),
  };
};

// =======================================================
// Service: Registrar o actualizar token
// =======================================================
const registerDeviceService = async ({
  identificador_dispositivo,
  token_push,
  plataforma = 'ANDROID',
  nombre_dispositivo = null,
  modelo_dispositivo = null,
  version_sistema = null,
  version_aplicacion = null,
  permiso_notificaciones =
  'NO_SOLICITADO',
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

  const deviceIdentifier =
    normalizeRequiredText(
      identificador_dispositivo,
      'identificador del dispositivo',
      150,
    );

  const pushToken =
    normalizeRequiredText(
      token_push,
      'token push',
      512,
    );

  const normalizedPlatform =
    normalizePlatform(
      plataforma,
    );

  const normalizedPermission =
    normalizePermission(
      permiso_notificaciones,
    );

  const now =
    new Date();

  const transaction =
    await sequelize.transaction();

  try {
    /*
    |--------------------------------------------------------------------------
    | Buscar el dispositivo del usuario
    |--------------------------------------------------------------------------
    */

    let userDevice =
      await UsuarioDispositivo
        .findOne({
          where: {
            id_usuario:
              userId,

            identificador_dispositivo:
              deviceIdentifier,
          },

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

    /*
    |--------------------------------------------------------------------------
    | Buscar si el token pertenece a otra fila
    |--------------------------------------------------------------------------
    */

    const currentTokenOwner =
      await UsuarioDispositivo
        .findOne({
          where: {
            token_push:
              pushToken,
          },

          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        });

    /*
    | Si el token está asociado a otra cuenta o dispositivo,
    | lo liberamos. Esto puede ocurrir después de cerrar sesión
    | e iniciar con otro usuario en el mismo teléfono.
    */

    if (
      currentTokenOwner &&
      (
        !userDevice ||
        currentTokenOwner
          .id_dispositivo !==
        userDevice
          .id_dispositivo
      )
    ) {
      await currentTokenOwner
        .update(
          {
            token_push:
              null,

            estado_dispositivo:
              'INACTIVO',

            fecha_desactivacion:
              now,

            motivo_desactivacion:
              'El token fue registrado por otra sesión o dispositivo.',
          },
          {
            transaction,
          },
        );
    }

    const deviceData = {
      id_usuario:
        userId,

      identificador_dispositivo:
        deviceIdentifier,

      token_push:
        pushToken,

      plataforma:
        normalizedPlatform,

      nombre_dispositivo:
        normalizeOptionalText(
          nombre_dispositivo,
          150,
        ),

      modelo_dispositivo:
        normalizeOptionalText(
          modelo_dispositivo,
          150,
        ),

      version_sistema:
        normalizeOptionalText(
          version_sistema,
          50,
        ),

      version_aplicacion:
        normalizeOptionalText(
          version_aplicacion,
          50,
        ),

      permiso_notificaciones:
        normalizedPermission,

      estado_dispositivo:
        'ACTIVO',

      fecha_registro_token:
        now,

      fecha_ultima_actividad:
        now,

      fecha_desactivacion:
        null,

      motivo_desactivacion:
        null,
    };

    let created = false;

    if (userDevice) {
      await userDevice.update(
        deviceData,
        {
          transaction,
        },
      );
    } else {
      userDevice =
        await UsuarioDispositivo
          .create(
            deviceData,
            {
              transaction,
            },
          );

      created = true;
    }

    await transaction.commit();

    return {
      dispositivo:
        formatDevice(
          userDevice,
        ),

      creado:
        created,

      token_actualizado:
        !created,
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

module.exports = registerDeviceService;