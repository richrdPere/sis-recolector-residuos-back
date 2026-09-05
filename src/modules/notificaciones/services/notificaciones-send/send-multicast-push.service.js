const { getFirebaseMessaging } = require('../../../../config/firebase-admin');

const normalizeData = (
  data = {},
) => {
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

const chunkArray = (
  items,
  size,
) => {
  const chunks = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
};

const sendMulticastPushService = async ({
  tokens,
  titulo,
  mensaje,
  data = {},
  url = null,
}) => {
  if (!Array.isArray(tokens)) {
    throw new TypeError(
      'Los tokens deben enviarse como un arreglo.',
    );
  }

  if (
    typeof titulo !== 'string' ||
    !titulo.trim()
  ) {
    throw new TypeError(
      'El título es obligatorio.',
    );
  }

  if (
    typeof mensaje !== 'string' ||
    !mensaje.trim()
  ) {
    throw new TypeError(
      'El mensaje es obligatorio.',
    );
  }

  const uniqueTokens = [
    ...new Set(
      tokens
        .filter(
          (token) =>
            typeof token ===
            'string' &&
            token.trim(),
        )
        .map(
          (token) =>
            token.trim(),
        ),
    ),
  ];

  if (!uniqueTokens.length) {
    return {
      total: 0,
      enviados: 0,
      fallidos: 0,
      resultados: [],
    };
  }

  const batches =
    chunkArray(
      uniqueTokens,
      500,
    );

  const resultados = [];

  let enviados = 0;
  let fallidos = 0;

  for (const batch of batches) {
    const payload = {
      tokens: batch,

      notification: {
        title:
          titulo.trim(),

        body:
          mensaje.trim(),
      },

      data:
        normalizeData(data),

      android: {
        priority: 'high',

        notification: {
          channelId:
            'alertas',

          sound:
            'default',
        },
      },

      webpush: {
        headers: {
          Urgency: 'high',
        },

        /*
         * Firebase requiere una URL HTTPS.
         */
        ...(url &&
          url.startsWith(
            'https://',
          )
          ? {
            fcmOptions: {
              link: url,
            },
          }
          : {}),
      },
    };

    const response =
      await getFirebaseMessaging()
        .sendEachForMulticast(
          payload,
        );

    enviados +=
      response.successCount;

    fallidos +=
      response.failureCount;

    response.responses.forEach(
      (item, index) => {
        resultados.push({
          token:
            batch[index],

          success:
            item.success,

          message_id:
            item.messageId ||
            null,

          error_code:
            item.error?.code ||
            null,

          error_message:
            item.error
              ?.message ||
            null,
        });
      },
    );
  }

  return {
    total:
      uniqueTokens.length,

    enviados,
    fallidos,
    resultados,
  };
};

module.exports = sendMulticastPushService;