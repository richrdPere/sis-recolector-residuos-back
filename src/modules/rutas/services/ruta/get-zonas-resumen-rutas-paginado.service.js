const { Op, fn, col, literal } = require('sequelize');
const db = require('../../../../database/models');

const { Zona, Ruta } = db;

// *********************************************************
// 1. CONFIGURACIÓN
// *********************************************************
const COLUMNAS_ORDEN = new Set([
  'id_zona',
  'codigo',
  'nombre',
  'estado',
  'created_at',
  'updated_at',
]);

const CAMPOS_CONTADORES = [
  'cantidad_rutas',
  'rutas_activas',
  'rutas_borrador',
  'rutas_inactivas',
  'rutas_habilitadas',
  'rutas_deshabilitadas',
  'rutas_operativas',
];

// *********************************************************
// 2. VALIDACIONES
// *********************************************************
const crearHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const obtenerEnteroPositivo = (
  value,
  defaultValue,
  nombre,
  maximo = Number.MAX_SAFE_INTEGER,
) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    !['string', 'number'].includes(typeof value) ||
    !/^\d+$/.test(String(value))
  ) {
    throw crearHttpError(
      `${nombre} debe ser un número entero positivo.`,
    );
  }

  const numero = Number(value);

  if (
    !Number.isSafeInteger(numero) ||
    numero < 1 ||
    numero > maximo
  ) {
    throw crearHttpError(
      `${nombre} debe estar entre 1 y ${maximo}.`,
    );
  }

  return numero;
};

const obtenerEstado = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if ([true, 'true', 1, '1'].includes(value)) {
    return true;
  }

  if ([false, 'false', 0, '0'].includes(value)) {
    return false;
  }

  throw crearHttpError(
    'estado debe ser true, false, 1 o 0.',
  );
};

// *********************************************************
// SERVICE: Obtener rutas por id de zona paginado
// *********************************************************
const getZonasResumenRutasPaginadoService = async (
  filters = {},
) => {
  const page = obtenerEnteroPositivo(
    filters.page,
    1,
    'page',
  );

  const limit = obtenerEnteroPositivo(
    filters.limit,
    12,
    'limit',
    100,
  );

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw crearHttpError(
      'La página solicitada excede el rango permitido.',
    );
  }

  const estado = obtenerEstado(filters.estado);

  if (
    filters.search !== undefined &&
    typeof filters.search !== 'string'
  ) {
    throw crearHttpError(
      'search debe ser una cadena de texto.',
    );
  }

  const search = (filters.search ?? '').trim();

  if (search.length > 120) {
    throw crearHttpError(
      'search no puede superar los 120 caracteres.',
    );
  }

  const sortBy = filters.sort_by ?? 'nombre';

  const sortOrder = String(
    filters.sort_order ?? 'ASC',
  ).toUpperCase();

  if (!COLUMNAS_ORDEN.has(sortBy)) {
    throw crearHttpError(
      'La columna de ordenamiento no es válida.',
    );
  }

  if (!['ASC', 'DESC'].includes(sortOrder)) {
    throw crearHttpError(
      'sort_order debe ser ASC o DESC.',
    );
  }

  // ----------------------------------------------------------
  // FILTROS DE ZONAS
  // ----------------------------------------------------------

  const where = {};

  if (estado !== undefined) {
    where.estado = estado;
  }

  if (search) {
    where[Op.or] = [
      {
        codigo: {
          [Op.like]: `%${search}%`,
        },
      },
      {
        nombre: {
          [Op.like]: `%${search}%`,
        },
      },
    ];
  }

  // Orden secundario para estabilizar la paginación.
  const order = [[sortBy, sortOrder]];

  if (sortBy !== 'id_zona') {
    order.push(['id_zona', 'ASC']);
  }

  // ----------------------------------------------------------
  // PAGINAR ZONAS
  // ----------------------------------------------------------

  const {
    count: total,
    rows: zonas,
  } = await Zona.findAndCountAll({
    attributes: [
      'id_zona',
      'codigo',
      'nombre',
      'descripcion',
      'color',
      'centro_latitud',
      'centro_longitud',
      'poligono_geojson',
      'estado',
      'created_at',
      'updated_at',
    ],
    where,
    limit,
    offset,
    order,
  });

  const resumenPorZona = new Map();

  // ----------------------------------------------------------
  // RESUMEN DE RUTAS DE LAS ZONAS DE ESTA PÁGINA
  // ----------------------------------------------------------

  if (zonas.length > 0) {
    const idsZonas = zonas.map(
      (zona) => zona.id_zona,
    );

    // Expresiones SQL fijas, sin interpolar datos del usuario.
    const resumenRutas = await Ruta.findAll({
      attributes: [
        'id_zona',

        [
          fn('COUNT', col('id_ruta')),
          'cantidad_rutas',
        ],

        [
          fn(
            'SUM',
            literal(
              "CASE WHEN estado_ruta = 'ACTIVA' THEN 1 ELSE 0 END",
            ),
          ),
          'rutas_activas',
        ],

        [
          fn(
            'SUM',
            literal(
              "CASE WHEN estado_ruta = 'BORRADOR' THEN 1 ELSE 0 END",
            ),
          ),
          'rutas_borrador',
        ],

        [
          fn(
            'SUM',
            literal(
              "CASE WHEN estado_ruta = 'INACTIVA' THEN 1 ELSE 0 END",
            ),
          ),
          'rutas_inactivas',
        ],

        [
          fn(
            'SUM',
            literal(
              'CASE WHEN estado = 1 THEN 1 ELSE 0 END',
            ),
          ),
          'rutas_habilitadas',
        ],

        [
          fn(
            'SUM',
            literal(
              'CASE WHEN estado = 0 THEN 1 ELSE 0 END',
            ),
          ),
          'rutas_deshabilitadas',
        ],

        [
          fn(
            'SUM',
            literal(
              "CASE WHEN estado_ruta = 'ACTIVA' AND estado = 1 THEN 1 ELSE 0 END",
            ),
          ),
          'rutas_operativas',
        ],

        [
          fn('MAX', col('updated_at')),
          'ultima_actualizacion_ruta',
        ],
      ],

      where: {
        id_zona: {
          [Op.in]: idsZonas,
        },
      },

      group: ['id_zona'],

      raw: true,
    });

    for (const resumen of resumenRutas) {
      resumenPorZona.set(
        String(resumen.id_zona),
        resumen,
      );
    }
  }

  // ----------------------------------------------------------
  // PREPARAR RESULTADO
  // ----------------------------------------------------------

  const items = zonas.map((zona) => {
    const datosZona = zona.get({
      plain: true,
    });

    const resumen = resumenPorZona.get(
      String(datosZona.id_zona),
    );

    const contadores = {};

    for (const campo of CAMPOS_CONTADORES) {
      contadores[campo] = Number(
        resumen?.[campo] ?? 0,
      );
    }

    return {
      ...datosZona,

      resumen_rutas: {
        ...contadores,
        ultima_actualizacion_ruta: resumen?.ultima_actualizacion_ruta ?? null,
      },
    };
  });

  const totalPages = Math.ceil(total / limit);

  return {
    items,

    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_previous_page: page > 1 && totalPages > 0,
    },
  };
};

module.exports = getZonasResumenRutasPaginadoService;