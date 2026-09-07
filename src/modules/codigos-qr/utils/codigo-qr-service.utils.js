// utils/codigo-qr-service.utils.js

const crypto = require('crypto');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    CodigoQr,
    Zona,
    Ruta,
} = db;

const generatePublicToken =
    () => {
        return crypto
            .randomBytes(32)
            .toString('hex');
    };

const generateAdministrativeCode =
    (
        resourceType,
    ) => {
        const timestamp =
            Date.now()
                .toString(36)
                .toUpperCase();

        const random =
            crypto
                .randomBytes(4)
                .toString('hex')
                .toUpperCase();

        return [
            'QR',
            resourceType,
            timestamp,
            random,
        ].join('-');
    };

const buildPublicQrUrl =
    (token) => {
        const publicWebUrl =
            process.env
                .PUBLIC_WEB_URL;

        if (!publicWebUrl) {
            throw new AppError(
                'La variable PUBLIC_WEB_URL no está configurada.',
                500,
                'PUBLIC_WEB_URL_NOT_CONFIGURED',
            );
        }

        try {
            return new URL(
                `/q/${token}`,
                publicWebUrl,
            ).toString();
        } catch {
            throw new AppError(
                'La URL pública del sistema no es válida.',
                500,
                'INVALID_PUBLIC_WEB_URL',
            );
        }
    };

const hashSensitiveValue =
    (value) => {
        if (!value) {
            return null;
        }

        const secret =
            process.env
                .QR_HASH_SECRET;

        if (!secret) {
            throw new AppError(
                'La variable QR_HASH_SECRET no está configurada.',
                500,
                'QR_HASH_SECRET_NOT_CONFIGURED',
            );
        }

        return crypto
            .createHmac(
                'sha256',
                secret,
            )
            .update(
                String(value),
            )
            .digest('hex');
    };

const getQrCodeOrFail =
    async (
        idCodigoQr,
        options = {},
    ) => {
        const {
            transaction = null,
            lock = null,
            include = false,
        } = options;

        const codigoQr =
            await CodigoQr.findByPk(
                idCodigoQr,
                {
                    ...(include
                        ? {
                            include: [
                                {
                                    association:
                                        'zona',

                                    required:
                                        false,
                                },
                                {
                                    association:
                                        'ruta',

                                    required:
                                        false,
                                },
                                {
                                    association:
                                        'usuario_creacion',

                                    attributes: [
                                        'id_usuario',
                                        'username',
                                    ],

                                    required:
                                        false,
                                },
                                {
                                    association:
                                        'codigo_reemplazado',

                                    required:
                                        false,
                                },
                                {
                                    association:
                                        'codigo_reemplazo',

                                    required:
                                        false,
                                },
                            ],
                        }
                        : {}),

                    transaction,

                    ...(lock
                        ? {
                            lock,
                        }
                        : {}),
                },
            );

        if (!codigoQr) {
            throw new AppError(
                'El código QR no fue encontrado.',
                404,
                'QR_CODE_NOT_FOUND',
            );
        }

        return codigoQr;
    };

const validateResourceExists =
    async ({
        tipoRecurso,
        idZona = null,
        idRuta = null,
        transaction = null,
    }) => {
        if (
            tipoRecurso ===
            'ZONA'
        ) {
            const zona =
                await Zona.findByPk(
                    idZona,
                    {
                        transaction,
                    },
                );

            if (!zona) {
                throw new AppError(
                    'La zona no fue encontrada.',
                    404,
                    'ZONE_NOT_FOUND',
                );
            }

            return {
                zona,
                ruta: null,
            };
        }

        const ruta =
            await Ruta.findByPk(
                idRuta,
                {
                    transaction,
                },
            );

        if (!ruta) {
            throw new AppError(
                'La ruta no fue encontrada.',
                404,
                'ROUTE_NOT_FOUND',
            );
        }

        return {
            zona: null,
            ruta,
        };
    };

const isQrExpired =
    (codigoQr) => {
        if (
            !codigoQr
                .fecha_expiracion
        ) {
            return false;
        }

        return (
            new Date(
                codigoQr
                    .fecha_expiracion,
            ).getTime() <=
            Date.now()
        );
    };

module.exports = {
    generatePublicToken,
    generateAdministrativeCode,
    buildPublicQrUrl,
    hashSensitiveValue,
    getQrCodeOrFail,
    validateResourceExists,
    isQrExpired,
};