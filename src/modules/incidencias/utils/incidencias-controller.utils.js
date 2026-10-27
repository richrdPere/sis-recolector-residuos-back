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
      'UNAUTHENTICATED',
    );
  }

  return usuarioId;
};

// *********************************************************
// UTILIDAD: OBTENER ROLES DE LA SESIÓN
// Admite:
// ['ADMIN']
// [{ nombre: 'ADMIN' }]
// [{ rol: { nombre: 'ADMIN' } }]
// *********************************************************
const obtenerRoles = (req) => {
  const roles = req.usuario?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  const nombres = roles
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      return item?.nombre ?? item?.rol?.nombre;
    })
    .filter(
      (nombre) =>
        typeof nombre === 'string' &&
        nombre.trim().length > 0,
    )
    .map((nombre) => nombre.trim());

  return [...new Set(nombres)];
};

// *********************************************************
// UTILIDAD: METADATA AUTENTICADA
// No obtener usuario ni roles desde req.body.
// *********************************************************
const obtenerMetadata = (req) => ({
  id_usuario: obtenerUsuarioId(req),
  roles: obtenerRoles(req),
});

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
    const estado = error.statusCode ?? error.status;

    const statusCode =
      Number.isInteger(estado) &&
        estado >= 400 &&
        estado <= 599
        ? estado
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
// Omitimos valores ausentes porque las validations comprueban
// la existencia de cada propiedad.
// *********************************************************
const obtenerFiltros = (query = {}) => {
  const campos = [
    'page',
    'limit',
    'search',
    'tipo',
    'prioridad',
    'origen',
    'estado_incidencia',
    'estado',
    'id_usuario_reporte',
    'id_responsable',
    'id_recorrido',
    'id_zona',
    'id_ruta',
    'fecha_desde',
    'fecha_hasta',
    'sort_by',
    'sort_order',
  ];

  const filtros = {};

  for (const campo of campos) {
    if (
      Object.prototype.hasOwnProperty.call(
        query,
        campo,
      ) &&
      query[campo] !== undefined
    ) {
      filtros[campo] = query[campo];
    }
  }

  return filtros;
};

// *********************************************************
// UTILIDAD: ARCHIVOS PROCESADOS POR EL BACKEND
//
// El middleware de carga debe establecer:
// req.incidenciaArchivos = [
//   {
//     tipo_archivo,
//     nombre_original,
//     nombre_archivo,
//     almacenamiento,
//     ruta_archivo,
//     mime_type,
//     tamanio_bytes,
//     descripcion,
//   },
// ];
//
// No aceptar estas rutas directamente desde req.body.
// *********************************************************
const obtenerArchivosProcesados = (req) => {
  const archivos = req.incidenciaArchivos;

  if (
    !Array.isArray(archivos) ||
    !archivos.length
  ) {
    throw new AppError(
      'Debe adjuntar al menos un archivo procesado por el servidor.',
      400,
      'INCIDENCIA_FILES_REQUIRED',
    );
  }

  return archivos;
};

module.exports = {
  obtenerUsuarioId,
  obtenerRoles,
  obtenerMetadata,
  responderSolicitud,
  obtenerFiltros,
  obtenerArchivosProcesados,
};