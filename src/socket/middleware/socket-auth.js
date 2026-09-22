// socket/middleware/socketAuth.js

const { verificarToken } = require('../../middlewares/auth.middleware');

// ==========================================================
// ERRORES PARA SOCKET.IO
// ==========================================================

const createSocketError = (
  message,
  code,
  statusCode = 401
) => {
  const error = new Error(message);

  error.data = {
    success: false,
    code,
    statusCode,
  };

  return error;
};

// ==========================================================
// OBTENER TOKEN
// ==========================================================

const getAccessToken = (socket) => {
  const authToken = socket.handshake.auth?.token;

  // Si se proporciona auth.token, tiene prioridad.
  if (authToken !== undefined) {
    if (
      typeof authToken !== 'string' ||
      !authToken.trim()
    ) {
      throw createSocketError(
        'El token de autenticación no es válido.',
        'INVALID_ACCESS_TOKEN',
      );
    }

    // Admite token directo o "Bearer <token>".
    return authToken
      .trim()
      .replace(/^Bearer\s+/i, '');
  }

  const authorization = socket.handshake.headers?.authorization;

  if (typeof authorization !== 'string') {
    return null;
  }

  const match = authorization
    .trim()
    .match(/^Bearer\s+(\S+)$/i);

  return match ? match[1] : null;
};

// ==========================================================
// ADAPTAR TU VALIDACIÓN HTTP
// ==========================================================

const authenticateToken = (accessToken) => {
  return new Promise((resolve, reject) => {
    const req = {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    };

    /*
     * Tu verificarToken actual no utiliza res:
     * solo consulta req y llama a next.
     *
     * Si cambia ese contrato, conviene extraer la validación
     * JWT a una función compartida por ambos middlewares.
     */
    verificarToken(req, null, (error) => {
      if (error) {
        return reject(error);
      }

      resolve(req.usuario);
    });
  });
};

// ==========================================================
// MIDDLEWARE DE AUTENTICACIÓN SOCKET
// ==========================================================

const socketAuth = async (socket, next) => {
  try {
    const accessToken = getAccessToken(socket);

    if (!accessToken) {
      throw createSocketError(
        'Debe proporcionar un token de autenticación.',
        'ACCESS_TOKEN_REQUIRED',
      );
    }

    const usuario =
      await authenticateToken(accessToken);

    // Normaliza el ID para tu usuariosManager.
    const rawId = usuario?.id_usuario;

    const idUsuario = typeof rawId === 'number' ||
      (
        typeof rawId === 'string' &&
        /^[1-9]\d*$/.test(rawId)
      )
      ? Number(rawId)
      : NaN;

    if (
      !Number.isSafeInteger(idUsuario) ||
      idUsuario <= 0
    ) {
      throw createSocketError(
        'El token no contiene un usuario válido.',
        'INVALID_ACCESS_TOKEN_PAYLOAD',
      );
    }

    // Exige vencimiento para evitar conexiones con JWT
    // sin fecha de expiración.
    if (!Number.isSafeInteger(usuario.exp)) {
      throw createSocketError(
        'El token no contiene una expiración válida.',
        'INVALID_ACCESS_TOKEN_PAYLOAD',
      );
    }

    if (usuario.exp * 1000 <= Date.now()) {
      throw createSocketError(
        'El token de acceso ha expirado.',
        'ACCESS_TOKEN_EXPIRED',
      );
    }

    const authenticatedUser = {
      ...usuario,
      id: idUsuario,
      id_usuario: idUsuario,
    };

    // Propiedad recomendada para nuevos handlers.
    socket.data.usuario = authenticatedUser;

    // Compatibilidad con tu index.js y handlers actuales.
    socket.usuario = authenticatedUser;
  } catch (error) {
    // Errores creados en este middleware.
    if (error.data?.code) {
      return next(error);
    }

    // Errores de tu middleware HTTP.
    const authenticationCodes = new Set([
      'ACCESS_TOKEN_REQUIRED',
      'INVALID_ACCESS_TOKEN_TYPE',
      'INVALID_ACCESS_TOKEN_PAYLOAD',
      'ACCESS_TOKEN_EXPIRED',
      'INVALID_ACCESS_TOKEN',
      'ACCESS_TOKEN_NOT_ACTIVE',
    ]);

    // Ajustar si AppError guarda el código con otro nombre.
    const code = error.code || error.errorCode;

    if (authenticationCodes.has(code)) {
      return next(
        createSocketError(
          error.message,
          code,
        ),
      );
    }

    // No exponer detalles internos al cliente.
    console.error(
      '[socketAuth] Falló la autenticación:',
      error.name,
      code || 'SOCKET_AUTH_INTERNAL_ERROR',
    );

    return next(
      createSocketError(
        'No se pudo validar la autenticación.',
        'SOCKET_AUTH_INTERNAL_ERROR',
        500,
      ),
    );
  }

  return next();
};

module.exports = socketAuth;