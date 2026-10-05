const AppError = require('../../../utils/app-error');

// *********************************************************
// UTILIDAD: OBTENER USUARIO AUTENTICADO
// *********************************************************
const obtenerUsuarioId = (req) => {
  const usuarioId = req.usuario?.id_usuario;
  if (usuarioId == null) {
    throw new AppError(
      'No se pudo identificar al usuario autenticado.',
      401,
    );
  }

  return usuarioId;
};

// *********************************************************
// UTILIDAD: EJECUTAR SERVICIO Y RESPONDER
// *********************************************************
const responderSolicitud = async (
  res,
  ejecutar,
  message,
  contexto,
) => {
  try {
    const data = await ejecutar();

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    const statusCode =
      Number.isInteger(error.statusCode) &&
        error.statusCode >= 400 &&
        error.statusCode <= 599
        ? error.statusCode
        : 500;

    if (statusCode >= 500) {
      console.error(`[${contexto}]`, error);
    }

    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500
        ? 'Ocurrió un error interno al procesar la solicitud.'
        : error.message,
      data: null,
    });
  }
};

// *********************************************************
// UTILIDAD: FILTROS DEL LISTADO
// *********************************************************
const obtenerFiltros = (query) => ({
  page: query.page,
  limit: query.limit,
  search: query.search,
  id_vehiculo: query.id_vehiculo,
  tipo_mantenimiento: query.tipo_mantenimiento,
  estado_mantenimiento: query.estado_mantenimiento,
  fecha_inicio: query.fecha_inicio,
  fecha_fin: query.fecha_fin,
  sort_by: query.sort_by,
  sort_order: query.sort_order,
});

module.exports = {
  obtenerUsuarioId,
  responderSolicitud,
  obtenerFiltros,
}