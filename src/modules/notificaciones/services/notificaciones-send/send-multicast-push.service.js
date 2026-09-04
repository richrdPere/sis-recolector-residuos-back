const { getFirebaseMessaging } = require('../../../../config/firebase-admin');

const sendMulticastPushService = async ({
    tokens,
    titulo,
    mensaje,
    data = {},
}) => {
    const uniqueTokens = [
        ...new Set(
            tokens
                .filter(Boolean)
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
            responses: [],
        };
    }

    /*
     * FCM admite hasta 500 destinos
     * por operación multicast.
     */

    const limitedTokens =
        uniqueTokens.slice(
            0,
            500,
        );

    const normalizedData =
        Object.fromEntries(
            Object.entries(data)
                .filter(
                    ([, value]) =>
                        value !== null &&
                        value !==
                        undefined,
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

    const response =
        await getFirebaseMessaging()
            .sendEachForMulticast({
                tokens:
                    limitedTokens,

                notification: {
                    title:
                        titulo.trim(),

                    body:
                        mensaje.trim(),
                },

                data:
                    normalizedData,

                android: {
                    priority:
                        'high',

                    notification: {
                        channelId:
                            'alertas',

                        sound:
                            'default',
                    },
                },

                webpush: {
                    headers: {
                        Urgency:
                            'high',
                    },
                },
            });

    return {
        total:
            limitedTokens.length,

        enviados:
            response.successCount,

        fallidos:
            response.failureCount,

        responses:
            response.responses,
    };
};

module.exports =
    sendMulticastPushService;