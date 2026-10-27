"use strict";

// ==========================================================
// ESTADOS Y TRANSICIONES
// ==========================================================

const TRANSICIONES = Object.freeze({
  REPORTADA: Object.freeze([
    "EN_REVISION",
    "EN_ATENCION",
    "RECHAZADA",
    "CANCELADA",
  ]),

  EN_REVISION: Object.freeze([
    "EN_ATENCION",
    "RECHAZADA",
    "CANCELADA",
  ]),

  EN_ATENCION: Object.freeze([
    "EN_REVISION",
    "RESUELTA",
    "CANCELADA",
  ]),

  RESUELTA: Object.freeze([]),
  RECHAZADA: Object.freeze([]),
  CANCELADA: Object.freeze([]),
});

const TERMINALES = Object.freeze([
  "RESUELTA",
  "RECHAZADA",
  "CANCELADA",
]);

const esTerminal = (estado) =>
  TERMINALES.includes(estado);

// ==========================================================
// ERRORES
// ==========================================================

function crearErrorIncidencia(
  message,
  status = 400,
  code = "INCIDENCIA_ERROR",
) {
  const error = new Error(message);

  error.status = status;
  error.statusCode = status;
  error.code = code;

  return error;
}

// ==========================================================
// VALIDAR TRANSICIÓN
// ==========================================================

function validarTransicion(actual, nuevo) {
  if (!TRANSICIONES[actual]?.includes(nuevo)) {
    throw crearErrorIncidencia(
      `No se permite cambiar de ${actual} a ${nuevo}.`,
      409,
      "INCIDENCIA_INVALID_TRANSITION",
    );
  }
}

// ==========================================================
// FILTROS
// ==========================================================

function construirWhereIncidencias(filtros, Op) {
  const where = {};

  for (const campo of [
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
  ]) {
    if (filtros[campo] !== undefined) {
      where[campo] = filtros[campo];
    }
  }

  if (filtros.search) {
    where[Op.or] = [
      {
        titulo: {
          [Op.like]: `%${filtros.search}%`,
        },
      },
      {
        descripcion: {
          [Op.like]: `%${filtros.search}%`,
        },
      },
    ];
  }

  const rango = {};

  if (filtros.fecha_desde) {
    rango[Op.gte] = filtros.fecha_desde.fecha;
  }

  if (filtros.fecha_hasta) {
    const { fecha, soloFecha } = filtros.fecha_hasta;

    if (soloFecha) {
      // Incluye todo el último día en horario de Lima.
      rango[Op.lt] = new Date(
        fecha.getTime() + 86400000,
      );
    } else {
      rango[Op.lte] = fecha;
    }
  }

  if (Reflect.ownKeys(rango).length) {
    where.fecha_reporte = rango;
  }

  return where;
}

// ==========================================================
// ASOCIACIONES PARA CONSULTAS
// ==========================================================

function construirIncludesIncidencia(
  conArchivos = false,
) {
  const include = [
    {
      association: "reportante",
      attributes: [
        "id_usuario",
        "username",
      ],
      required: false,
    },

    {
      association: "responsable",
      attributes: [
        "id_usuario",
        "username",
      ],
      required: false,
    },

    {
      association: "zona",
      attributes: [
        "id_zona",
        "codigo",
        "nombre",
      ],
      required: false,
    },

    {
      association: "ruta",
      attributes: [
        "id_ruta",
        "codigo",
        "nombre",
      ],
      required: false,
    },

    {
      association: "recorrido",
      attributes: [
        "id_recorrido",
        "estado_recorrido",
      ],
      required: false,
    },
  ];

  if (conArchivos) {
    include.push({
      association: "archivos",
      separate: true,

      where: {
        estado: true,
      },

      attributes: [
        "id_incidencia_archivo",
        "id_incidencia",
        "id_usuario_carga",
        "tipo_archivo",
        "nombre_original",
        "mime_type",
        "tamanio_bytes",
        "descripcion",
        "estado",
        "created_at",
      ],

      order: [
        ["created_at", "ASC"],
        ["id_incidencia_archivo", "ASC"],
      ],
    });
  }

  return include;
}

// ==========================================================
// SERIALIZACIÓN DE ARCHIVOS
// ==========================================================

function serializarArchivo(archivo) {
  const resultado = archivo.get
    ? archivo.get({ plain: true })
    : { ...archivo };

  // Los datos internos se utilizan desde el servicio de descarga.
  delete resultado.ruta_archivo;
  delete resultado.nombre_archivo;
  delete resultado.almacenamiento;

  return resultado;
}

// ==========================================================
// PAGINACIÓN
// ==========================================================

function paginacion(total, page, limit) {
  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

module.exports = {
  TRANSICIONES,
  TERMINALES,
  esTerminal,
  crearErrorIncidencia,
  validarTransicion,
  construirWhereIncidencias,
  construirIncludesIncidencia,
  serializarArchivo,
  paginacion,
};