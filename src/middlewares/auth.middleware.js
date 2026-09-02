const jwt = require('jsonwebtoken');

const AppError = require(
  '../utils/app-error',
);

/*
|--------------------------------------------------------------------------
| Normalizar los roles contenidos en el token
|--------------------------------------------------------------------------
|
| Admite cualquiera de estas estructuras:
|
| roles: ['ADMIN', 'SUPERVISOR']
|
| roles: [
|   { id_rol: 1, nombre: 'ADMIN' }
| ]
|
*/

const normalizeRoles = (roles = []) => {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles
    .map((rol) => {
      if (typeof rol === 'string') {
        return rol;
      }

      if (
        rol &&
        typeof rol === 'object'
      ) {
        return (
          rol.nombre ||
          rol.name ||
          rol.codigo ||
          null
        );
      }

      return null;
    })
    .filter(Boolean)
    .map((rol) =>
      String(rol)
        .trim()
        .toUpperCase(),
    );
};

/*
|--------------------------------------------------------------------------
| Obtener el Bearer token
|--------------------------------------------------------------------------
*/

const getBearerToken = (req) => {
  const authorization =
    req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [type, token] =
    authorization.split(' ');

  if (
    type?.toLowerCase() !== 'bearer' ||
    !token
  ) {
    return null;
  }

  return token.trim();
};

/*
|--------------------------------------------------------------------------
| Verificar access token
|--------------------------------------------------------------------------
*/

const verificarToken = (
  req,
  res,
  next,
) => {
  try {
    const accessToken = getBearerToken(req);

    if (!accessToken) {
      throw new AppError(
        'Debe proporcionar un token de autenticación.',
        401,
        'ACCESS_TOKEN_REQUIRED',
      );
    }

    const secret =
      process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new AppError(
        'No se configuró JWT_ACCESS_SECRET.',
        500,
        'JWT_ACCESS_SECRET_NOT_CONFIGURED',
      );
    }

    const payload = jwt.verify(
      accessToken,
      secret,
      {
        issuer:
          process.env.JWT_ISSUER ||
          'backend-recoleccion-residuos',

        audience:
          process.env.JWT_AUDIENCE ||
          'recoleccion-residuos-clients',
      },
    );

    /*
    |--------------------------------------------------------------------------
    | Impedir que un refresh token se use como access token
    |--------------------------------------------------------------------------
    */

    if (
      payload.token_type !==
      'access'
    ) {
      throw new AppError(
        'El token proporcionado no es un access token.',
        401,
        'INVALID_ACCESS_TOKEN_TYPE',
      );
    }

    if (!payload.id_usuario) {
      throw new AppError(
        'El token no contiene un usuario válido.',
        401,
        'INVALID_ACCESS_TOKEN_PAYLOAD',
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Guardar usuario autenticado en el request
    |--------------------------------------------------------------------------
    */

    req.usuario = {
      ...payload,
      id: payload.id_usuario,
      id_usuario: payload.id_usuario,
      roles: normalizeRoles(payload.roles),
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    if (
      error.name ===
      'TokenExpiredError'
    ) {
      return next(
        new AppError(
          'El token de acceso ha expirado.',
          401,
          'ACCESS_TOKEN_EXPIRED',
        ),
      );
    }

    if (
      error.name ===
      'JsonWebTokenError'
    ) {
      return next(
        new AppError(
          'El token de acceso no es válido.',
          401,
          'INVALID_ACCESS_TOKEN',
        ),
      );
    }

    if (
      error.name ===
      'NotBeforeError'
    ) {
      return next(
        new AppError(
          'El token de acceso todavía no está habilitado.',
          401,
          'ACCESS_TOKEN_NOT_ACTIVE',
        ),
      );
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Autorizar roles
|--------------------------------------------------------------------------
|
| Ejemplos:
|
| autorizarRoles('ADMIN')
|
| autorizarRoles(
|   'ADMIN',
|   'SUPERVISOR',
| )
|
*/

const autorizarRoles = (
  ...rolesPermitidos
) => {
  const rolesNormalizados =
    rolesPermitidos
      .flat()
      .filter(Boolean)
      .map((rol) =>
        String(rol)
          .trim()
          .toUpperCase(),
      );

  if (!rolesNormalizados.length) {
    throw new Error(
      'autorizarRoles requiere al menos un rol permitido.',
    );
  }

  return (req, res, next) => {
    try {
      if (!req.usuario) {
        throw new AppError(
          'El usuario no está autenticado.',
          401,
          'UNAUTHENTICATED_USER',
        );
      }

      const rolesUsuario =
        normalizeRoles(
          req.usuario.roles,
        );

      if (!rolesUsuario.length) {
        throw new AppError(
          'El usuario no tiene roles activos asignados.',
          403,
          'USER_WITHOUT_ACTIVE_ROLE',
        );
      }

      const tieneRolPermitido =
        rolesUsuario.some((rol) =>
          rolesNormalizados.includes(
            rol,
          ),
        );

      if (!tieneRolPermitido) {
        throw new AppError(
          'No tiene permisos para realizar esta acción.',
          403,
          'INSUFFICIENT_PERMISSIONS',
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  verificarToken,
  autorizarRoles,
  normalizeRoles,
};