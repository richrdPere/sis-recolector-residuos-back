// middlewares/codigo-qr-rate-limit.middleware.js

const { rateLimit } = require('express-rate-limit');

const publicQrRateLimit =
  rateLimit({
    windowMs: 60 * 1000,

    /*
     * Hasta 60 consultas por IP
     * durante un minuto.
     */
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // standardHeaders: true
    handler: (
      req,
      res,
    ) => {
      return res
        .status(429)
        .json({
          success: false,
          message: 'Se realizaron demasiadas consultas. Intente nuevamente en unos minutos.',
          error: {
            code: 'TOO_MANY_QR_REQUESTS',
          },
        });
    },
  });

module.exports = { publicQrRateLimit };