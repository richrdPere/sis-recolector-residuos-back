const AppError = require('../../../../utils/app-error');

const { getFirebaseMessaging } = require('../../../../config/firebase-admin');

/*
|--------------------------------------------------------------------------
| Normalizar datos de FCM
|--------------------------------------------------------------------------
|
| Firebase solamente permite strings dentro de message.data.
|
*/

const normalizeData = (data = {}) => {
  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([, value]) =>
          value !== null &&
          value !== undefined,
      )
      .map(
        ([key, value]) => [
          key,
          typeof value ===
            'string'
            ? value
            : JSON.stringify(
              value,
            ),
        ],
      ),
  );
};

/*
|--------------------------------------------------------------------------
| Enviar notificación push
|--------------------------------------------------------------------------
*/

const sendPushNotificationService = async ({
  token,
  titulo,
  mensaje,
  data = {},
  url = '/',
  imagen_url = null,
}) => {
  if (
    !token ||
    typeof token !==
    'string'
  ) {
    throw new AppError(
      'El token FCM no es válido.',
      400,
      'INVALID_FCM_TOKEN',
    );
  }

  if (!titulo?.trim()) {
    throw new AppError(
      'El título de la notificación es obligatorio.',
      400,
      'NOTIFICATION_TITLE_REQUIRED',
    );
  }

  if (!mensaje?.trim()) {
    throw new AppError(
      'El mensaje de la notificación es obligatorio.',
      400,
      'NOTIFICATION_MESSAGE_REQUIRED',
    );
  }

  const messaging =
    getFirebaseMessaging();

  const payload = {
    token:
      token.trim(),

    notification: {
      title:
        titulo.trim(),

      body:
        mensaje.trim(),

      ...(imagen_url
        ? {
          imageUrl:
            imagen_url,
        }
        : {}),
    },

    data:
      normalizeData(
        data,
      ),

    /*
     * Configuración Flutter Android
     */
    android: {
      priority: 'high',

      notification: {
        channelId:
          'alertas',

        sound:
          'default',

        ...(imagen_url
          ? {
            imageUrl:
              imagen_url,
          }
          : {}),
      },
    },

    /*
     * Configuración Angular Web
     */
    webpush: {
      headers: {
        Urgency: 'high',
      },

      notification: {
        icon:
          '/icons/icon-192x192.png',

        badge:
          '/icons/badge-72x72.png',

        ...(imagen_url
          ? {
            image:
              imagen_url,
          }
          : {}),
      },

      fcmOptions: {
        link: url,
      },
    },
  };

  try {
    const messageId =
      await messaging.send(
        payload,
      );

    return {
      success: true,
      message_id:
        messageId,
    };
  } catch (error) {
    console.error(
      'Error enviando notificación FCM:',
      {
        code:
          error.code,

        message:
          error.message,
      },
    );

    throw new AppError(
      'No se pudo enviar la notificación push.',
      502,
      'FCM_SEND_ERROR',
      {
        firebase_code:
          error.code,
      },
    );
  }
};

module.exports = sendPushNotificationService;

//TODO: exemplo de uso:
// const sendPushNotificationService =
//   require(
//     '../push/send-push-notification.service',
//   );

// await sendPushNotificationService({
//   token:
//     dispositivo.token_push,

//   titulo:
//     'Nueva ruta asignada',

//   mensaje:
//     'Se te asignó una ruta de recolección para mañana.',

//   data: {
//     tipo:
//       'PROGRAMACION_ASIGNADA',

//     id_programacion:
//       programacion
//         .id_programacion,

//     id_ruta:
//       programacion.id_ruta,
//   },

//   url:
//     `/programaciones/${programacion.id_programacion}`,
// });