const { Op } = require('sequelize');
const db = require('../../database/models');
const { messaging } = require('../../config/firebase');

// Modelos
const {
  UsuarioDispositivo,
} = db;

/*
|--------------------------------------------------------------------------
| Errores que invalidan definitivamente un token
|--------------------------------------------------------------------------
*/
const TOKEN_INVALID_ERRORS =
  new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ]);

/*
|--------------------------------------------------------------------------
| Normalizar destinatarios
|--------------------------------------------------------------------------
*/
const normalizeUserIds = (destinatariosIds = []) => {
  if (
    !Array.isArray(
      destinatariosIds,
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      destinatariosIds
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  ];
};

/*
|--------------------------------------------------------------------------
| Convertir valor a String para FCM
|--------------------------------------------------------------------------
*/
const toFcmString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/*
|--------------------------------------------------------------------------
| Normalizar data de FCM
|--------------------------------------------------------------------------
|
| Firebase requiere que todos los valores de data sean String.
|
*/
const normalizeFcmData = (
  data = {},
) => {
  return Object.fromEntries(
    Object.entries(data).map(
      ([key, value]) => [
        key,
        toFcmString(value),
      ],
    ),
  );
};

/*
|--------------------------------------------------------------------------
| Dividir elementos en bloques
|--------------------------------------------------------------------------
*/
const splitIntoChunks = (
  elements,
  size = 500,
) => {
  const chunks = [];

  for (
    let index = 0;
    index < elements.length;
    index += size
  ) {
    chunks.push(
      elements.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
};

/*
|--------------------------------------------------------------------------
| Ocultar token para logs
|--------------------------------------------------------------------------
*/
const maskToken = (token) => {
  if (!token) {
    return '';
  }

  if (token.length <= 20) {
    return '***';
  }

  return `${token.substring(
    0,
    20,
  )}...`;
};

/*
|--------------------------------------------------------------------------
| Enviar notificación FCM a usuarios
|--------------------------------------------------------------------------
*/
const enviarFcmUsuariosService = async ({
  destinatariosIds = [],
  notification = null,
  data = {},
  android = null,
  apns = null,
  webpush = null,
  contexto = 'Notificación',
}) => {
  try {
    /*
    |--------------------------------------------------------------------------
    | Normalizar destinatarios
    |--------------------------------------------------------------------------
    */
    const usuariosIds = normalizeUserIds(destinatariosIds);

    if (usuariosIds.length === 0) {
      return {
        success: true,
        enviados: 0,
        fallidos: 0,
        tokensInvalidos: 0,
        sinDestinatarios: true,
        sinDispositivos: true,
        message: 'La notificación no tiene destinatarios válidos.',
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Buscar dispositivos activos
    |--------------------------------------------------------------------------
    */
    const dispositivos = await UsuarioDispositivo
      .findAll({
        where: {
          usuario_id: {
            [Op.in]:
              usuariosIds,
          },

          activo: true,

          token_fcm: {
            [Op.and]: [
              {
                [Op.ne]: null,
              },
              {
                [Op.ne]: '',
              },
            ],
          },
        },

        attributes: [
          'id',
          'usuario_id',
          'token_fcm',
          'plataforma',
        ],

        raw: true,
      });

    /*
    |--------------------------------------------------------------------------
    | Eliminar tokens vacíos o duplicados
    |--------------------------------------------------------------------------
    */
    const tokens = [
      ...new Set(
        dispositivos
          .map(
            (dispositivo) =>
              dispositivo
                .token_fcm
                ?.trim(),
          )
          .filter(Boolean),
      ),
    ];

    if (tokens.length === 0) {
      console.warn(
        `[FCM] ${contexto}: ` +
        'los destinatarios no tienen dispositivos activos.',
      );

      return {
        success: true,
        enviados: 0,
        fallidos: 0,
        tokensInvalidos: 0,
        sinDestinatarios: false,
        sinDispositivos: true,
        message:
          'Los destinatarios no tienen dispositivos activos.',
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Construir configuración compartida
    |--------------------------------------------------------------------------
    */
    const normalizedData = normalizeFcmData(data);

    const chunks = splitIntoChunks(
      tokens,
      500,
    );

    let enviados = 0;
    let fallidos = 0;

    const invalidTokens =
      new Set();

    /*
    |--------------------------------------------------------------------------
    | Enviar lotes
    |--------------------------------------------------------------------------
    */
    for (const chunkTokens of chunks) {
      const message = {
        tokens: chunkTokens,
        data: normalizedData,
      };

      /*
       * Permite enviar mensajes visibles
       * o mensajes únicamente de datos.
       */
      if (notification) {
        message.notification = {
          title:
            toFcmString(
              notification.title,
            ),

          body:
            toFcmString(
              notification.body,
            ),
        };
      }

      if (android) {
        message.android =
          android;
      }

      if (apns) {
        message.apns = apns;
      }

      if (webpush) {
        message.webpush =
          webpush;
      }

      const response =
        await messaging
          .sendEachForMulticast(
            message,
          );

      enviados += response.successCount;
      fallidos += response.failureCount;

      response.responses.forEach(
        (result, index) => {
          if (result.success) {
            return;
          }

          const token = chunkTokens[index];
          const errorCode = result.error?.code;

          console.error(
            '[FCM] Destino rechazado:',
            {
              contexto,
              token:
                maskToken(token),
              errorCode,
              message:
                result.error
                  ?.message,
            },
          );

          if (
            errorCode &&
            TOKEN_INVALID_ERRORS
              .has(errorCode)
          ) {
            invalidTokens.add(
              token,
            );
          }
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Desactivar tokens inválidos
    |--------------------------------------------------------------------------
    */
    const tokensInvalidos = [
      ...invalidTokens,
    ];

    if (
      tokensInvalidos.length > 0
    ) {
      await UsuarioDispositivo
        .update(
          {
            activo: false,
          },
          {
            where: {
              token_fcm: {
                [Op.in]:
                  tokensInvalidos,
              },
            },
          },
        );
    }

    console.log(
      `[FCM] ${contexto}: ` +
      `${enviados} enviadas, ` +
      `${fallidos} fallidas, ` +
      `${tokensInvalidos.length} tokens desactivados.`,
    );

    return {
      success: true,
      destinatarios: usuariosIds.length,
      dispositivos: tokens.length,
      enviados,
      fallidos,
      tokensInvalidos: tokensInvalidos.length,
      sinDestinatarios: false,
      sinDispositivos: false,
    };
  } catch (error) {
    console.error(
      `[FCM] Error en ${contexto}:`,
      error,
    );

    return {
      success: false,
      enviados: 0,
      fallidos: 0,
      tokensInvalidos: 0,
      sinDestinatarios: false,
      sinDispositivos: false,

      message: error.message || 'No se pudo enviar la notificación.',
    };
  }
};

module.exports = enviarFcmUsuariosService;