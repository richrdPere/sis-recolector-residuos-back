const AppError = require('../../../utils/app-error');

// *********************************************************
// USUARIO AUTENTICADO
// *********************************************************

const obtenerUsuario = req => {
  if (!req.usuario) {
    throw new AppError(
      'No existe una sesión autenticada.',
      401,
      'UNAUTHENTICATED',
    );
  }

  return req.usuario;
};

// *********************************************************
// FILTROS
// *********************************************************

const obtenerFiltros = (query = {}) => {
  if (
    !query ||
    typeof query !== 'object' ||
    Array.isArray(query)
  ) {
    throw new AppError(
      'Los filtros deben ser un objeto.',
      400,
      'AUDITORIA_DATOS_INVALIDOS',
    );
  }

  // Conserva los filtros desconocidos para que el service
  // los rechace, en lugar de ignorarlos silenciosamente.
  return Object.fromEntries(
    Object.entries(query).filter(
      ([, valor]) => valor !== undefined,
    ),
  );
};

// *********************************************************
// RESPUESTA DE ERROR
// *********************************************************

const responderError = (res, error, contexto) => {
  const statusCode =
    Number.isInteger(error?.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    // No imprimir cuerpos, cambios ni datos completos del evento.
    console.error(`[${contexto}]`, {
      nombre: error?.name,
      codigo: error?.code,
    });
  }

  if (res.headersSent) {
    return res.end();
  }

  res.set('Cache-Control', 'no-store');

  return res.status(statusCode).json({
    success: false,

    message: statusCode >= 500
      ? 'Ocurrió un error interno al consultar la auditoría.'
      : error.message,

    code: statusCode >= 500
      ? 'INTERNAL_ERROR'
      : error.code || 'AUDITORIA_ERROR',

    data: null,
  });
};

// *********************************************************
// RESPUESTA DE CONSULTA
// *********************************************************

const responderSolicitud = async (
  res,
  ejecutar,
  message,
  contexto,
) => {
  try {
    const data = await ejecutar();

    res.set('Cache-Control', 'no-store');

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    return responderError(
      res,
      error,
      contexto,
    );
  }
};

module.exports = {
  obtenerUsuario,
  obtenerFiltros,
  responderError,
  responderSolicitud,
};