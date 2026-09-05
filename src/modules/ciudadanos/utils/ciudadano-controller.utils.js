// utils/ciudadano-controller.utils.js

const AppError = require('../../../utils/app-error');

const getAuthenticatedUserId =
  (req) => {
    const idUsuario =
      req.usuario
        ?.id_usuario ||
      req.usuario?.id ||
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

const parseBooleanQuery = (
  value,
  defaultValue = false,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return defaultValue;
  }

  if (
    value === true ||
    value === 'true' ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === false ||
    value === 'false' ||
    value === '0'
  ) {
    return false;
  }

  return defaultValue;
};

module.exports = {
  getAuthenticatedUserId,
  parseBooleanQuery,
};