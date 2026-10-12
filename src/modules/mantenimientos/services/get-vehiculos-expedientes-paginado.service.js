const { Op, fn, col, literal } = require('sequelize');

// Ajusta esta ruta a tu índice de modelos.
const {
  Vehiculo,
  VehiculoMantenimiento,
} = require('../../../database/models');

// *********************************************************
// CONSTANTES
// *********************************************************
const TIPOS_VEHICULO = [
  'CAMION_COMPACTADOR',
  'CAMION_BARANDA',
  'CAMION_VOLQUETE',
  'MOTOFURGON',
  'OTRO',
];

const ESTADOS_OPERATIVOS = [
  'DISPONIBLE',
  'ASIGNADO',
  'EN_RUTA',
  'EN_MANTENIMIENTO',
  'FUERA_DE_SERVICIO',
];

const CAMPOS_ORDEN = [
  'id_vehiculo',
  'codigo',
  'placa',
  'marca',
  'modelo',
  'estado_operativo',
  'created_at',
  'updated_at',
];

// *********************************************************
// UTILIDADES
// *********************************************************
const crearError = (mensaje) => {
  const error = new Error(mensaje);
  error.statusCode = 400;
  return error;
};

const leerTexto = (valor, nombre, defecto = '') => {
  if (valor === undefined || valor === null) {
    return defecto;
  }

  if (typeof valor !== 'string') {
    throw crearError(`${nombre} debe ser una cadena de texto.`);
  }

  return valor.trim();
};

const leerEntero = (valor, nombre, defecto, maximo) => {
  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }

  if (
    !['string', 'number'].includes(typeof valor) ||
    !/^\d+$/.test(String(valor))
  ) {
    throw crearError(`${nombre} debe ser un entero positivo.`);
  }

  const numero = Number(valor);

  if (
    !Number.isSafeInteger(numero) ||
    numero < 1 ||
    numero > maximo
  ) {
    throw crearError(
      `${nombre} debe estar entre 1 y ${maximo}.`,
    );
  }

  return numero;
};

const leerBooleano = (valor, nombre, defecto) => {
  if (valor === undefined || valor === null || valor === '') {
    return defecto;
  }

  if ([true, 'true', 1, '1'].includes(valor)) {
    return true;
  }

  if ([false, 'false', 0, '0'].includes(valor)) {
    return false;
  }

  throw crearError(`${nombre} debe ser true o false.`);
};

const leerCatalogo = (valor, nombre, opciones) => {
  const texto = leerTexto(valor, nombre).toUpperCase();

  if (texto && !opciones.includes(texto)) {
    throw crearError(`${nombre} no es válido.`);
  }

  return texto;
};

// *********************************************************
// SERVICE
// *********************************************************
const getVehiculosExpedientesPaginadoService = async (
  query = {},
) => {
  // -------------------------------------------------------
  // 1. VALIDAR PAGINACIÓN Y FILTROS
  // -------------------------------------------------------
  const page = leerEntero(
    query.page,
    'page',
    1,
    Number.MAX_SAFE_INTEGER,
  );

  const limit = leerEntero(query.limit, 'limit', 10, 100);

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw crearError('La página solicitada es demasiado grande.');
  }

  const search = leerTexto(query.search, 'search');

  if (search.length > 150) {
    throw crearError('search no puede superar 150 caracteres.');
  }

  const tipoVehiculo = leerCatalogo(
    query.tipo_vehiculo,
    'tipo_vehiculo',
    TIPOS_VEHICULO,
  );

  const estadoOperativo = leerCatalogo(
    query.estado_operativo,
    'estado_operativo',
    ESTADOS_OPERATIVOS,
  );

  // Sin filtro: incluye activos e inactivos.
  const estado = leerBooleano(query.estado, 'estado', undefined);

  // Por defecto: solo vehículos que tienen expediente.
  const soloConMantenimientos = leerBooleano(
    query.solo_con_mantenimientos,
    'solo_con_mantenimientos',
    false,
  );

  const sortBy = leerTexto(
    query.sort_by,
    'sort_by',
    'id_vehiculo',
  );

  const sortOrder = leerTexto(
    query.sort_order,
    'sort_order',
    'DESC',
  ).toUpperCase();

  if (!CAMPOS_ORDEN.includes(sortBy)) {
    throw crearError('sort_by no es válido.');
  }

  if (!['ASC', 'DESC'].includes(sortOrder)) {
    throw crearError('sort_order debe ser ASC o DESC.');
  }

  // -------------------------------------------------------
  // 2. CONSTRUIR FILTROS DE VEHÍCULOS
  // -------------------------------------------------------
  const where = {};

  if (search) {
    where[Op.or] = [
      { codigo: { [Op.like]: `%${search}%` } },
      { placa: { [Op.like]: `%${search}%` } },
      { marca: { [Op.like]: `%${search}%` } },
      { modelo: { [Op.like]: `%${search}%` } },
    ];
  }

  if (tipoVehiculo) {
    where.tipo_vehiculo = tipoVehiculo;
  }

  if (estadoOperativo) {
    where.estado_operativo = estadoOperativo;
  }

  if (estado !== undefined) {
    where.estado = estado;
  }

  // EXISTS no duplica vehículos ni altera el conteo paginado.
  // Los identificadores proceden de los modelos, no del usuario.
  if (soloConMantenimientos) {
    const generador = Vehiculo.sequelize
      .getQueryInterface()
      .queryGenerator;

    const tablaMantenimientos = generador.quoteTable(
      VehiculoMantenimiento.getTableName(),
    );

    const aliasVehiculo = generador.quoteIdentifier(
      Vehiculo.name,
    );

    const campoVehiculo = generador.quoteIdentifier(
      'id_vehiculo',
    );

    where[Op.and] = [
      literal(`
        EXISTS (
          SELECT 1
          FROM ${tablaMantenimientos} AS mantenimiento_existe
          WHERE mantenimiento_existe.${campoVehiculo}
            = ${aliasVehiculo}.${campoVehiculo}
        )
      `),
    ];
  }

  // Desempate para mantener una paginación estable.
  const order = [[sortBy, sortOrder]];

  if (sortBy !== 'id_vehiculo') {
    order.push(['id_vehiculo', 'DESC']);
  }

  // -------------------------------------------------------
  // 3. PAGINAR VEHÍCULOS
  // -------------------------------------------------------
  const { count, rows } = await Vehiculo.findAndCountAll({
    where,

    attributes: [
      'id_vehiculo',
      'codigo',
      'placa',
      'marca',
      'modelo',
      'anio',
      'color',
      'tipo_vehiculo',
      'foto_url',
      'kilometraje',
      'estado_operativo',
      'estado',
      'created_at',
      'updated_at',
    ],

    order,
    limit,
    offset,

    // Excluir vehículos eliminados lógicamente.
    paranoid: true,
  });

  // -------------------------------------------------------
  // 4. RESUMEN DE MANTENIMIENTOS DE LA PÁGINA
  // -------------------------------------------------------
  let resumenes = [];

  if (rows.length > 0) {
    const idsVehiculos = rows.map(
      (vehiculo) => vehiculo.get('id_vehiculo'),
    );

    // Literales constantes: no contienen valores del usuario.
    resumenes = await VehiculoMantenimiento.findAll({
      where: {
        id_vehiculo: {
          [Op.in]: idsVehiculos,
        },
      },

      attributes: [
        'id_vehiculo',

        [
          fn('COUNT', col('id_mantenimiento')),
          'cantidad_mantenimientos',
        ],

        [
          literal(`
            SUM(CASE WHEN estado_mantenimiento = 'PROGRAMADO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_programados',
        ],

        [
          literal(`
            SUM(CASE WHEN estado_mantenimiento = 'EN_PROCESO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_en_proceso',
        ],

        [
          literal(`
            SUM(CASE WHEN estado_mantenimiento = 'FINALIZADO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_finalizados',
        ],

        [
          literal(`
            SUM(CASE WHEN estado_mantenimiento = 'CANCELADO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_cancelados',
        ],

        [
          literal(`
            SUM(CASE WHEN tipo_mantenimiento = 'PREVENTIVO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_preventivos',
        ],

        [
          literal(`
            SUM(CASE WHEN tipo_mantenimiento = 'CORRECTIVO'
              THEN 1 ELSE 0 END)
          `),
          'cantidad_correctivos',
        ],

        [
          literal(`
            MAX(CASE WHEN estado_mantenimiento = 'FINALIZADO'
              THEN fecha_fin_real ELSE NULL END)
          `),
          'fecha_ultimo_mantenimiento_finalizado',
        ],

        [
          literal(`
            SUM(CASE WHEN estado_mantenimiento = 'FINALIZADO'
              THEN COALESCE(costo_total, 0) ELSE 0 END)
          `),
          'costo_total_finalizados',
        ],

        [
          literal(`
            SUM(CASE
              WHEN estado_mantenimiento = 'FINALIZADO'
                AND costo_total IS NULL
              THEN 1 ELSE 0 END)
          `),
          'cantidad_finalizados_sin_costo',
        ],
      ],

      group: ['id_vehiculo'],
      raw: true,
    });
  }

  // BIGINT puede llegar como string: no convertir IDs a Number.
  const resumenPorVehiculo = new Map(
    resumenes.map((resumen) => [
      String(resumen.id_vehiculo),
      resumen,
    ]),
  );

  // -------------------------------------------------------
  // 5. CONSTRUIR RESULTADO
  // -------------------------------------------------------
  const vehiculos = rows.map((row) => {
    const vehiculo = row.get({ plain: true });

    const resumen = resumenPorVehiculo.get(
      String(vehiculo.id_vehiculo),
    );

    return {
      ...vehiculo,

      // Normalizar el estado administrativo del vehículo.
      estado: Boolean(vehiculo.estado),

      expediente: {
        cantidad_mantenimientos: Number(
          resumen?.cantidad_mantenimientos ?? 0,
        ),

        cantidad_programados: Number(
          resumen?.cantidad_programados ?? 0,
        ),

        cantidad_en_proceso: Number(
          resumen?.cantidad_en_proceso ?? 0,
        ),

        cantidad_finalizados: Number(
          resumen?.cantidad_finalizados ?? 0,
        ),

        cantidad_cancelados: Number(
          resumen?.cantidad_cancelados ?? 0,
        ),

        cantidad_preventivos: Number(
          resumen?.cantidad_preventivos ?? 0,
        ),

        cantidad_correctivos: Number(
          resumen?.cantidad_correctivos ?? 0,
        ),

        fecha_ultimo_mantenimiento_finalizado:
          resumen?.fecha_ultimo_mantenimiento_finalizado ?? null,

        // Conservar como string para evitar convertir
        // importes DECIMAL a números de punto flotante.
        costo_total_finalizados: String(
          resumen?.costo_total_finalizados ?? '0.00',
        ),

        cantidad_finalizados_sin_costo: Number(
          resumen?.cantidad_finalizados_sin_costo ?? 0,
        ),
      },
    };
  });

  const total = Number(count);
  const totalPages = Math.ceil(total / limit);

  return {
    vehiculos,

    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      has_next_page: page < totalPages,
      has_previous_page: page > 1 && totalPages > 0,
    },
    
  };
};

module.exports = getVehiculosExpedientesPaginadoService;