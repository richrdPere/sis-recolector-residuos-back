const AppError = require('../../../utils/app-error');

// ===============================================
// Obtener usuario autenticado
// ===============================================

const getAuthenticatedUserId = (req) => {
  const idUsuario =
    req.usuario?.id_usuario ??
    req.usuario?.id ??
    null;

  if (!idUsuario) {
    throw new AppError(
      'No se pudo identificar al usuario autenticado.',
      401,
      'AUTHENTICATED_USER_NOT_FOUND',
    );
  }

  return idUsuario;
};

// ===============================================
// Obtener metadatos del tracking
// ===============================================

const getTrackingMetadata = (req) => {
  const forwardedFor =
    req.headers[
    'x-forwarded-for'
    ];

  const forwardedIp =
    typeof forwardedFor ===
      'string'
      ? forwardedFor
        .split(',')[0]
        .trim()
      : null;

  return {
    id_usuario:
      getAuthenticatedUserId(
        req,
      ),

    /*
    | Las rutas de transmisión están destinadas
    | a la aplicación móvil. No aceptamos el origen
    | directamente desde req.body.
    */

    origen:
      'MOVIL',

    ip:
      forwardedIp ||
      req.ip ||
      req.socket
        ?.remoteAddress ||
      null,

    user_agent:
      req.get(
        'user-agent',
      ) || null,
  };
};

module.exports = {
  getAuthenticatedUserId,
  getTrackingMetadata,
};