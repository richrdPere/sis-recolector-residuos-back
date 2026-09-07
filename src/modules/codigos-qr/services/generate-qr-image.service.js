// services/generate-qr-image.service.js

const QRCode = require('qrcode');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
} = require('../validations/codigo-qr.validation');

// Utils
const {
  getQrCodeOrFail,
  buildPublicQrUrl,
  isQrExpired,
} = require('../utils/codigo-qr-service.utils');

// ===============================================
// SERVICE: Genenrar imagen PNG o SVG del codigo QR
// ===============================================
const generateQrImageService = async ({
  id_codigo_qr,
  formato = 'PNG',
  width = 512,
  margin = 4,
}) => {
  const id =
    validateId(
      id_codigo_qr,
      'identificador del código QR',
    );

  const normalizedFormat =
    String(
      formato,
    )
      .trim()
      .toUpperCase();

  if (
    ![
      'PNG',
      'SVG',
    ].includes(
      normalizedFormat,
    )
  ) {
    throw new AppError(
      'El formato debe ser PNG o SVG.',
      400,
      'INVALID_QR_IMAGE_FORMAT',
    );
  }

  const normalizedWidth =
    Math.min(
      Math.max(
        Number(width) ||
        512,
        256,
      ),
      2048,
    );

  const normalizedMargin =
    Math.min(
      Math.max(
        Number(margin) ||
        4,
        2,
      ),
      10,
    );

  const codigoQr =
    await getQrCodeOrFail(
      id,
    );

  if (
    codigoQr.estado_qr ===
    'REVOCADO'
  ) {
    throw new AppError(
      'No se puede generar la imagen de un código QR revocado.',
      409,
      'QR_REVOKED',
    );
  }

  if (
    isQrExpired(
      codigoQr,
    )
  ) {
    throw new AppError(
      'El código QR está expirado.',
      409,
      'QR_EXPIRED',
    );
  }

  const publicUrl =
    buildPublicQrUrl(
      codigoQr
        .token_publico,
    );

  const options = {
    errorCorrectionLevel:
      'H',

    width:
      normalizedWidth,

    margin:
      normalizedMargin,

    color: {
      dark:
        '#000000',

      light:
        '#FFFFFF',
    },
  };

  if (
    normalizedFormat ===
    'SVG'
  ) {
    const content =
      await QRCode.toString(
        publicUrl,
        {
          ...options,
          type: 'svg',
        },
      );

    return {
      content,

      content_type:
        'image/svg+xml',

      file_name:
        `${codigoQr.codigo}.svg`,

      url_publica:
        publicUrl,
    };
  }

  const content =
    await QRCode.toBuffer(
      publicUrl,
      {
        ...options,
        type: 'png',
      },
    );

  return {
    content,

    content_type:
      'image/png',

    file_name:
      `${codigoQr.codigo}.png`,

    url_publica:
      publicUrl,
  };
};

module.exports = generateQrImageService;