"use strict";

// ==========================================================
// CONSTANTES
// ==========================================================

const TIPOS = Object.freeze([
  "VIA_BLOQUEADA",
  "AVERIA_VEHICULO",
  "ACCIDENTE",
  "RECOLECCION_NO_REALIZADA",
  "ACUMULACION_RESIDUOS",
  "PUNTO_INACCESIBLE",
  "OTRO",
]);

const PRIORIDADES = Object.freeze([
  "BAJA",
  "MEDIA",
  "ALTA",
  "CRITICA",
]);

const ORIGENES = Object.freeze([
  "APP_OPERATIVA",
  "APP_CIUDADANA",
  "WEB_MUNICIPAL",
  "WEB_CIUDADANA",
]);

const ESTADOS = Object.freeze([
  "REPORTADA",
  "EN_REVISION",
  "EN_ATENCION",
  "RESUELTA",
  "RECHAZADA",
  "CANCELADA",
]);

const TIPOS_ARCHIVO = Object.freeze([
  "IMAGEN",
  "VIDEO",
  "AUDIO",
  "DOCUMENTO",
]);

const ALMACENAMIENTOS = Object.freeze([
  "LOCAL",
  "S3",
]);

const SORT_BY = Object.freeze([
  "id_incidencia",
  "fecha_reporte",
  "created_at",
  "updated_at",
  "titulo",
  "tipo",
  "prioridad",
  "estado_incidencia",
]);

const CAMPOS_EDITABLES = [
  "tipo",
  "prioridad",
  "titulo",
  "descripcion",
  "latitud",
  "longitud",
  "precision_ubicacion",
  "direccion_referencia",
];

const has = (objeto, campo) =>
  Object.prototype.hasOwnProperty.call(objeto, campo);

// ==========================================================
// VALIDADORES GENERALES
// ==========================================================

function errorValidacion(campo, mensaje) {
  const error = new Error(mensaje);

  error.status = 400;
  error.statusCode = 400;
  error.code = "INCIDENCIA_VALIDATION_ERROR";
  error.details = [{ campo, mensaje }];

  return error;
}

function fail(campo, mensaje) {
  throw errorValidacion(campo, mensaje);
}

function validarObjeto(value, campo = "body") {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    ![Object.prototype, null].includes(
      Object.getPrototypeOf(value),
    )
  ) {
    fail(campo, "Debe proporcionar un objeto válido.");
  }

  return value;
}

function validarCamposPermitidos(value, campos) {
  validarObjeto(value);

  for (const campo of Object.keys(value)) {
    if (!campos.includes(campo)) {
      fail(campo, `El campo ${campo} no está permitido.`);
    }
  }
}

function validarId(value, campo = "id", nullable = false) {
  if (nullable && value === null) {
    return null;
  }

  if (
    typeof value === "number" &&
    !Number.isSafeInteger(value)
  ) {
    fail(
      campo,
      "Envíe identificadores grandes como cadenas decimales.",
    );
  }

  if (
    !["string", "number", "bigint"].includes(typeof value)
  ) {
    fail(campo, "Debe ser un identificador entero positivo.");
  }

  const id = String(value);

  if (
    !/^[1-9]\d*$/.test(id) ||
    BigInt(id) > 9223372036854775807n
  ) {
    fail(campo, "Debe ser un BIGINT positivo válido.");
  }

  // Evita pérdida de precisión en JavaScript.
  return id;
}

function validarTexto(
  value,
  campo,
  max,
  min = 1,
  nullable = false,
) {
  if (nullable && value === null) {
    return null;
  }

  if (typeof value !== "string") {
    fail(campo, "Debe ser texto.");
  }

  const texto = value.trim();

  if (texto.length < min || texto.length > max) {
    fail(
      campo,
      `Debe contener entre ${min} y ${max} caracteres.`,
    );
  }

  return texto;
}

function validarTextoLargo(value, campo, min = 1) {
  const texto = validarTexto(value, campo, 15000, min);

  if (Buffer.byteLength(texto, "utf8") > 60000) {
    fail(campo, "El texto es demasiado extenso.");
  }

  return texto;
}

function validarOpcion(value, campo, opciones) {
  if (!opciones.includes(value)) {
    fail(
      campo,
      `Valores permitidos: ${opciones.join(", ")}.`,
    );
  }

  return value;
}

function validarBooleano(value, campo = "estado") {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  fail(campo, "Debe ser true o false.");
}

function validarEntero(value, campo, min, max) {
  if (
    !["number", "string"].includes(typeof value) ||
    !/^\d+$/.test(String(value))
  ) {
    fail(campo, "Debe ser un número entero.");
  }

  const numero = Number(value);

  if (
    !Number.isSafeInteger(numero) ||
    numero < min ||
    numero > max
  ) {
    fail(campo, `Debe estar entre ${min} y ${max}.`);
  }

  return numero;
}

function validarDecimal(
  value,
  campo,
  min,
  max,
  decimales,
) {
  if (value === null) {
    return null;
  }

  if (
    !["number", "string"].includes(typeof value) ||
    !/^-?\d+(?:\.\d+)?$/.test(String(value))
  ) {
    fail(campo, "Debe ser un número decimal válido.");
  }

  const numero = Number(value);

  if (
    !Number.isFinite(numero) ||
    numero < min ||
    numero > max
  ) {
    fail(campo, `Debe estar entre ${min} y ${max}.`);
  }

  const parteDecimal = String(value).split(".")[1] || "";

  if (parteDecimal.length > decimales) {
    fail(campo, `Admite hasta ${decimales} decimales.`);
  }

  return numero;
}

// ==========================================================
// UBICACIÓN Y CAMPOS EDITABLES
// ==========================================================

function validarUbicacion(data) {
  const tieneLatitud = data.latitud != null;
  const tieneLongitud = data.longitud != null;

  if (tieneLatitud !== tieneLongitud) {
    fail(
      "latitud",
      "Debe proporcionar latitud y longitud conjuntamente.",
    );
  }

  if (
    data.precision_ubicacion != null &&
    !tieneLatitud
  ) {
    fail(
      "precision_ubicacion",
      "La precisión requiere una ubicación registrada.",
    );
  }
}

function normalizarEditables(data) {
  const resultado = {};

  if (has(data, "tipo")) {
    resultado.tipo = validarOpcion(
      data.tipo,
      "tipo",
      TIPOS,
    );
  }

  if (has(data, "prioridad")) {
    resultado.prioridad = validarOpcion(
      data.prioridad,
      "prioridad",
      PRIORIDADES,
    );
  }

  if (has(data, "titulo")) {
    resultado.titulo = validarTexto(
      data.titulo,
      "titulo",
      150,
      3,
    );
  }

  if (has(data, "descripcion")) {
    resultado.descripcion = validarTextoLargo(
      data.descripcion,
      "descripcion",
    );
  }

  if (has(data, "latitud")) {
    resultado.latitud = validarDecimal(
      data.latitud,
      "latitud",
      -90,
      90,
      7,
    );
  }

  if (has(data, "longitud")) {
    resultado.longitud = validarDecimal(
      data.longitud,
      "longitud",
      -180,
      180,
      7,
    );
  }

  if (has(data, "precision_ubicacion")) {
    resultado.precision_ubicacion = validarDecimal(
      data.precision_ubicacion,
      "precision_ubicacion",
      0,
      99999999.99,
      2,
    );
  }

  if (has(data, "direccion_referencia")) {
    resultado.direccion_referencia = validarTexto(
      data.direccion_referencia,
      "direccion_referencia",
      500,
      1,
      true,
    );
  }

  return resultado;
}

// ==========================================================
// CREAR
// ==========================================================

function validarCrearIncidencia(data) {
  validarCamposPermitidos(data, [
    ...CAMPOS_EDITABLES,
    "origen",
    "id_recorrido",
    "id_zona",
    "id_ruta",
  ]);

  const resultado = normalizarEditables(data);

  for (const campo of [
    "tipo",
    "titulo",
    "descripcion",
  ]) {
    if (!has(resultado, campo)) {
      fail(campo, "El campo es obligatorio.");
    }
  }

  resultado.origen = validarOpcion(
    data.origen,
    "origen",
    ORIGENES,
  );

  resultado.prioridad ??= "MEDIA";

  for (const campo of [
    "id_recorrido",
    "id_zona",
    "id_ruta",
  ]) {
    resultado[campo] = has(data, campo)
      ? validarId(data[campo], campo, true)
      : null;
  }

  validarUbicacion(resultado);

  return resultado;
}

// ==========================================================
// ACTUALIZAR
// ==========================================================

function validarActualizarIncidencia(data) {
  validarCamposPermitidos(data, CAMPOS_EDITABLES);

  if (!Object.keys(data).length) {
    fail(
      "body",
      "Debe enviar al menos un campo editable.",
    );
  }

  // La ubicación completa se valida en el service,
  // combinando estos cambios con el registro existente.
  return normalizarEditables(data);
}

// ==========================================================
// RESPONSABLE
// ==========================================================

function validarAsignarResponsable(data) {
  validarCamposPermitidos(data, [
    "id_responsable",
  ]);

  return {
    id_responsable: validarId(
      data.id_responsable,
      "id_responsable",
      true,
    ),
  };
}

// ==========================================================
// ESTADO DE ATENCIÓN
// ==========================================================

function validarCambiarEstadoIncidencia(data) {
  validarCamposPermitidos(data, [
    "estado_incidencia",
    "detalle_resolucion",
  ]);

  const resultado = {
    estado_incidencia: validarOpcion(
      data.estado_incidencia,
      "estado_incidencia",
      ESTADOS,
    ),
  };

  const esTerminal = [
    "RESUELTA",
    "RECHAZADA",
    "CANCELADA",
  ].includes(resultado.estado_incidencia);

  if (esTerminal) {
    resultado.detalle_resolucion = validarTextoLargo(
      data.detalle_resolucion,
      "detalle_resolucion",
      3,
    );
  } else if (has(data, "detalle_resolucion")) {
    fail(
      "detalle_resolucion",
      "El detalle de cierre corresponde a un estado terminal.",
    );
  }

  return resultado;
}

// ==========================================================
// HABILITACIÓN ADMINISTRATIVA
// ==========================================================

function validarHabilitacion(data) {
  validarCamposPermitidos(data, ["estado"]);

  return {
    estado: validarBooleano(data.estado),
  };
}

// ==========================================================
// FECHAS Y PAGINACIÓN
// ==========================================================

function validarFechaFiltro(value, campo) {
  if (typeof value !== "string") {
    fail(campo, "Debe ser una fecha ISO.");
  }

  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(value);

  const formatoTimestamp =
    /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

  if (!soloFecha && !formatoTimestamp.test(value)) {
    fail(
      campo,
      "Use YYYY-MM-DD o una fecha ISO con zona horaria explícita.",
    );
  }

  const dia = value.slice(0, 10);

  const fechaDia = new Date(
    `${dia}T00:00:00.000Z`,
  );

  if (
    !Number.isFinite(fechaDia.getTime()) ||
    fechaDia.toISOString().slice(0, 10) !== dia
  ) {
    fail(campo, "Fecha inexistente.");
  }

  const fecha = new Date(
    soloFecha
      ? `${value}T00:00:00-05:00`
      : value,
  );

  if (!Number.isFinite(fecha.getTime())) {
    fail(campo, "Fecha inválida.");
  }

  return { fecha, soloFecha };
}

function validarPaginadoIncidencias(data = {}) {
  validarCamposPermitidos(data, [
    "page",
    "limit",
    "search",
    "tipo",
    "prioridad",
    "origen",
    "estado_incidencia",
    "estado",
    "id_usuario_reporte",
    "id_responsable",
    "id_recorrido",
    "id_zona",
    "id_ruta",
    "fecha_desde",
    "fecha_hasta",
    "sort_by",
    "sort_order",
  ]);

  const resultado = {
    page: validarEntero(
      data.page ?? 1,
      "page",
      1,
      1000000,
    ),

    limit: validarEntero(
      data.limit ?? 10,
      "limit",
      1,
      100,
    ),

    sort_by: validarOpcion(
      data.sort_by ?? "fecha_reporte",
      "sort_by",
      SORT_BY,
    ),

    sort_order: validarOpcion(
      data.sort_order ?? "DESC",
      "sort_order",
      ["ASC", "DESC"],
    ),
  };

  if (has(data, "search")) {
    resultado.search = validarTexto(
      data.search,
      "search",
      150,
      0,
    );
  }

  const opciones = {
    tipo: TIPOS,
    prioridad: PRIORIDADES,
    origen: ORIGENES,
    estado_incidencia: ESTADOS,
  };

  for (const [campo, valores] of Object.entries(opciones)) {
    if (has(data, campo)) {
      resultado[campo] = validarOpcion(
        data[campo],
        campo,
        valores,
      );
    }
  }

  if (has(data, "estado")) {
    resultado.estado = validarBooleano(data.estado);
  }

  for (const campo of [
    "id_usuario_reporte",
    "id_responsable",
    "id_recorrido",
    "id_zona",
    "id_ruta",
  ]) {
    if (has(data, campo)) {
      resultado[campo] = validarId(
        data[campo],
        campo,
      );
    }
  }

  for (const campo of [
    "fecha_desde",
    "fecha_hasta",
  ]) {
    if (has(data, campo)) {
      resultado[campo] = validarFechaFiltro(
        data[campo],
        campo,
      );
    }
  }

  if (
    resultado.fecha_desde &&
    resultado.fecha_hasta
  ) {
    const hasta =
      resultado.fecha_hasta.fecha.getTime() +
      (
        resultado.fecha_hasta.soloFecha
          ? 86400000 - 1
          : 0
      );

    if (
      resultado.fecha_desde.fecha.getTime() > hasta
    ) {
      fail(
        "fecha_hasta",
        "El rango de fechas no es válido.",
      );
    }
  }

  return resultado;
}

// ==========================================================
// ARCHIVOS
// Metadatos construidos por el backend después de procesar
// y almacenar los archivos.
// ==========================================================

function validarArchivosIncidencia(
  archivos,
  {
    maxArchivos = 10,
    maxBytes = 50 * 1024 * 1024,
  } = {},
) {
  if (
    !Array.isArray(archivos) ||
    !archivos.length ||
    archivos.length > maxArchivos
  ) {
    fail(
      "archivos",
      `Debe proporcionar entre 1 y ${maxArchivos} archivos.`,
    );
  }

  const mimePorTipo = {
    IMAGEN: [
      "image/jpeg",
      "image/png",
      "image/webp",
    ],

    VIDEO: [
      "video/mp4",
      "video/webm",
    ],

    AUDIO: [
      "audio/mpeg",
      "audio/mp4",
      "audio/ogg",
      "audio/wav",
      "audio/webm",
    ],

    DOCUMENTO: [
      "application/pdf",
    ],
  };

  return archivos.map((archivo) => {
    validarCamposPermitidos(archivo, [
      "tipo_archivo",
      "nombre_original",
      "nombre_archivo",
      "almacenamiento",
      "ruta_archivo",
      "mime_type",
      "tamanio_bytes",
      "descripcion",
    ]);

    const resultado = {
      tipo_archivo: validarOpcion(
        archivo.tipo_archivo,
        "tipo_archivo",
        TIPOS_ARCHIVO,
      ),

      nombre_original: validarTexto(
        archivo.nombre_original,
        "nombre_original",
        255,
      ),

      nombre_archivo: validarTexto(
        archivo.nombre_archivo,
        "nombre_archivo",
        255,
      ),

      almacenamiento: validarOpcion(
        archivo.almacenamiento ?? "LOCAL",
        "almacenamiento",
        ALMACENAMIENTOS,
      ),

      ruta_archivo: validarTexto(
        archivo.ruta_archivo,
        "ruta_archivo",
        1024,
      ),

      mime_type: validarTexto(
        archivo.mime_type,
        "mime_type",
        150,
      ).toLowerCase(),

      tamanio_bytes: validarEntero(
        archivo.tamanio_bytes,
        "tamanio_bytes",
        1,
        maxBytes,
      ),

      descripcion: has(archivo, "descripcion")
        ? validarTexto(
          archivo.descripcion,
          "descripcion",
          500,
          1,
          true,
        )
        : null,
    };

    if (
      /[\\/\x00-\x1f]/.test(
        resultado.nombre_archivo,
      )
    ) {
      fail(
        "nombre_archivo",
        "Debe ser un nombre generado, sin directorios.",
      );
    }

    const rutaInsegura =
      /^[\/\\]|^[a-z]+:/i.test(resultado.ruta_archivo) ||
      /[\\\x00-\x1f]/.test(resultado.ruta_archivo) ||
      resultado.ruta_archivo
        .split("/")
        .some(
          (parte) =>
            !parte ||
            parte === "." ||
            parte === "..",
        );

    if (rutaInsegura) {
      fail(
        "ruta_archivo",
        "Use una ruta relativa o clave de objeto, sin segmentos inseguros.",
      );
    }

    if (
      !mimePorTipo[resultado.tipo_archivo].includes(
        resultado.mime_type,
      )
    ) {
      fail(
        "mime_type",
        "MIME no admitido para el tipo de archivo.",
      );
    }

    return resultado;
  });
}

// ==========================================================
// EXPORTACIONES
// ==========================================================

module.exports = {
  TIPOS,
  PRIORIDADES,
  ORIGENES,
  ESTADOS,
  TIPOS_ARCHIVO,
  ALMACENAMIENTOS,

  validarId,
  validarUbicacion,
  validarCrearIncidencia,
  validarActualizarIncidencia,
  validarAsignarResponsable,
  validarCambiarEstadoIncidencia,
  validarHabilitacion,
  validarPaginadoIncidencias,
  validarArchivosIncidencia,
};