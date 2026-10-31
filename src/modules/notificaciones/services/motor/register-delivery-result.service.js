'use strict';

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const {
  validateId,
  cut,
  INVALID_TOKEN_CODES,
  TRANSIENT_CODES,
} = require('../../utils/motor-notification.utils');

// Modelos
const {
  sequelize,
  NotificacionEnvio,
  NotificacionUsuario,
  UsuarioDispositivo,
} = db;

// ==========================================================
// SERVICE: REGISTRAR RESULTADO DE UN INTENTO FCM
// ==========================================================
const registerDeliveryResultService = async ({
  id_envio,
  resultado,
  token_utilizado = null,
  duracion_ms = 0,
} = {}) => {
  const envioId = validateId(id_envio);

  if (
    !resultado ||
    typeof resultado.success !== 'boolean'
  ) {
    throw new AppError(
      'El resultado FCM no es válido.',
      400,
      'INVALID_DELIVERY_RESULT',
    );
  }

  if (
    !Number.isSafeInteger(duracion_ms) ||
    duracion_ms < 0 ||
    duracion_ms > 4294967295
  ) {
    throw new AppError(
      'La duración del envío no es válida.',
      400,
      'INVALID_DELIVERY_DURATION',
    );
  }

  const exitoso = resultado.success;

  const codigoError = exitoso
    ? null
    : cut(
      resultado.error?.code || 'FCM_UNKNOWN_ERROR',
      150,
    );

  const mensajeError = exitoso
    ? null
    : cut(
      resultado.error?.message ||
      'FCM rechazó el envío.',
      1000,
    );

  const tokenInvalido =
    !exitoso &&
    INVALID_TOKEN_CODES.has(codigoError);

  const estadoEnvio = exitoso
    ? 'ENVIADO'
    : tokenInvalido
      ? 'TOKEN_INVALIDO'
      : 'FALLIDO';

  const messageId = exitoso
    ? resultado.messageId || null
    : null;

  if (
    exitoso &&
    (
      typeof messageId !== 'string' ||
      !messageId.trim() ||
      messageId.length > 500
    )
  ) {
    throw new AppError(
      'Un resultado exitoso debe incluir el messageId de Firebase.',
      400,
      'PROVIDER_MESSAGE_ID_REQUIRED',
    );
  }

  if (
    tokenInvalido &&
    (
      typeof token_utilizado !== 'string' ||
      !token_utilizado.trim()
    )
  ) {
    throw new AppError(
      'Debe proporcionar el token utilizado para revocarlo de forma segura.',
      400,
      'SENT_TOKEN_REQUIRED',
    );
  }

  return sequelize.transaction(async (transaction) => {
    const envio = await NotificacionEnvio.findByPk(
      envioId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!envio) {
      throw new AppError(
        'El intento de envío no existe.',
        404,
        'DELIVERY_ATTEMPT_NOT_FOUND',
      );
    }

    const resumen = {
      id_envio: String(envio.id_envio),
      exitoso,
      token_invalido: tokenInvalido,
      reintentable:
        !exitoso &&
        TRANSIENT_CODES.has(codigoError),
      estado_envio: estadoEnvio,
      codigo_error: codigoError,
      mensaje_error: mensajeError,
    };

    // Un resultado definitivo no se sobrescribe.
    if (
      !['PENDIENTE', 'PROCESANDO'].includes(
        envio.estado_envio,
      )
    ) {
      const mismoResultado =
        envio.estado_envio === estadoEnvio &&
        (
          exitoso
            ? envio.id_mensaje_proveedor === messageId
            : envio.codigo_error === codigoError
        );

      if (!mismoResultado) {
        throw new AppError(
          'El intento ya tiene un resultado definitivo diferente.',
          409,
          'DELIVERY_RESULT_CONFLICT',
        );
      }

      return {
        ...resumen,
        duplicado: true,
      };
    }

    await envio.update(
      {
        estado_envio: estadoEnvio,
        id_mensaje_proveedor: messageId,
        codigo_error: codigoError,
        mensaje_error: mensajeError,
        fecha_envio: exitoso ? new Date() : null,
        duracion_ms,
      },
      {
        transaction,
        hooks: false,
      },
    );

    if (tokenInvalido) {
      const destinatario =
        await NotificacionUsuario.findByPk(
          envio.id_notificacion_usuario,
          {
            transaction,
            attributes: ['id_usuario'],
          },
        );

      if (!destinatario) {
        throw new AppError(
          'No se encontró el destinatario del intento.',
          409,
          'DELIVERY_RECIPIENT_NOT_FOUND',
        );
      }

      /*
       * No revocar un token renovado o transferido
       * a otro usuario durante el envío.
       */
      await UsuarioDispositivo.update(
        {
          token_push: null,
          estado_dispositivo: 'REVOCADO',
          fecha_desactivacion: new Date(),
          motivo_desactivacion: cut(
            mensajeError,
            500,
          ),
        },
        {
          where: {
            id_dispositivo: envio.id_dispositivo,
            id_usuario: destinatario.id_usuario,
            token_push: token_utilizado,
          },
          transaction,
          hooks: false,
        },
      );
    }

    return {
      ...resumen,
      duplicado: false,
    };
  });
};

module.exports = registerDeliveryResultService;