// services/get-qr-code-by-id.service.js

// Validations
const { validateId } = require('../validations/codigo-qr.validation');

// Utils
const {
  getQrCodeOrFail,
  buildPublicQrUrl,
} = require('../utils/codigo-qr-service.utils');

// ===============================================
// SERVICE: Obtener codigo QR por Id
// ===============================================
const getQrCodeByIdService = async (idCodigoQr) => {
  const id =
    validateId(
      idCodigoQr,
      'identificador del código QR',
    );

  const codigoQr =
    await getQrCodeOrFail(
      id,
      {
        include: true,
      },
    );

  return {
    ...codigoQr.toJSON(),

    url_publica:
      buildPublicQrUrl(
        codigoQr
          .token_publico,
      ),
  };
};

module.exports = getQrCodeByIdService;