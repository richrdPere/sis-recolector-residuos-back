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
// Los servicios validan cuáles admite cada reporte.
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
      'INVALID_REPORT_FILTER',
    );
  }

  return Object.fromEntries(
    Object.entries(query).filter(
      ([, valor]) => valor !== undefined,
    ),
  );
};

// *********************************************************
// RESPUESTA DE ERROR
// *********************************************************
const responderError = (
  res,
  error,
  contexto,
) => {
  const statusCode =
    Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
      ? error.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error(`[${contexto}]`, error);
  }

  if (res.headersSent) {
    return res.end();
  }

  const exportadorPendiente =
    statusCode === 501 &&
    error.code === 'REPORT_RENDERER_NOT_CONFIGURED';

  return res.status(statusCode).json({
    success: false,

    message:
      statusCode >= 500 && !exportadorPendiente
        ? 'Ocurrió un error interno al procesar el reporte.'
        : error.message,

    code:
      statusCode >= 500 && !exportadorPendiente
        ? 'INTERNAL_ERROR'
        : error.code || 'REPORT_ERROR',

    data: null,
  });
};

// *********************************************************
// RESPUESTA JSON
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

// *********************************************************
// RESPUESTA DE DESCARGA
// *********************************************************
const responderArchivo = async (
  res,
  ejecutar,
  contexto,
) => {
  try {
    const archivo = await ejecutar();

    if (!Buffer.isBuffer(archivo.buffer)) {
      throw new AppError(
        'El servicio no devolvió un archivo válido.',
        500,
        'INVALID_REPORT_FILE',
      );
    }

    res.attachment(archivo.nombre_archivo);

    res.set({
      'Content-Type': archivo.mime_type,

      'Content-Length':
        String(archivo.buffer.length),

      'Cache-Control': 'no-store',

      'X-Content-Type-Options': 'nosniff',

      'X-Reporte-Exportacion-Id':
        String(archivo.id_reporte_exportacion),
    });

    // Permite leer estos encabezados desde Angular.
    res.append(
      'Access-Control-Expose-Headers',
      'Content-Disposition, X-Reporte-Exportacion-Id',
    );

    return res.status(200).send(archivo.buffer);
  } catch (error) {
    return responderError(
      res,
      error,
      contexto,
    );
  }
};

// *********************************************************
// VALIDAR SOLICITUD DE EXPORTACIÓN
// *********************************************************
const TIPOS_EXPORTABLES = new Set([
  'RESUMEN_OPERATIVO',
  'PROGRAMACIONES',
  'RECORRIDOS',
  'RECOLECCIONES',
  'ATENCION_PUNTOS',
  'INCIDENCIAS',
  'VEHICULOS',
  'MANTENIMIENTOS',
  'REPORTES_CIUDADANOS',
]);

const obtenerSolicitudExportacion = body => {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    throw new AppError(
      'El cuerpo de la exportación debe ser un objeto.',
      400,
      'INVALID_EXPORT_BODY',
    );
  }

  const permitidos = [
    'tipo_reporte',
    'formato',
    'filtros',
    'columnas',
  ];

  if (
    Object.keys(body).some(
      campo => !permitidos.includes(campo),
    )
  ) {
    throw new AppError(
      'La exportación contiene campos no permitidos.',
      400,
      'INVALID_EXPORT_BODY',
    );
  }

  if (
    typeof body.tipo_reporte !== 'string' ||
    !TIPOS_EXPORTABLES.has(body.tipo_reporte)
  ) {
    throw new AppError(
      'El tipo de reporte no está habilitado.',
      400,
      'INVALID_REPORT_TYPE',
    );
  }

  if (
    !['pdf', 'xlsx', 'csv'].includes(body.formato)
  ) {
    throw new AppError(
      'El formato debe ser pdf, xlsx o csv.',
      400,
      'INVALID_REPORT_FORMAT',
    );
  }

  return {
    tipo_reporte: body.tipo_reporte,
    formato: body.formato,

    query: obtenerFiltros(
      body.filtros ?? {},
    ),

    columnas: body.columnas ?? null,
  };
};

module.exports = {
  obtenerUsuario,
  obtenerFiltros,
  responderError,
  responderSolicitud,
  responderArchivo,
  obtenerSolicitudExportacion,
};