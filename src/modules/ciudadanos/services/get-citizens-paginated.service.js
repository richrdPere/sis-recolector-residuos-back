const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const ESTADOS = [
  'PENDIENTE',
  'ACTIVO',
  'SUSPENDIDO',
  'INACTIVO',
];

const ORIGENES = [
  'WEB',
  'APP',
  'QR',
  'ADMINISTRATIVO',
];

const validarTexto = (valor, campo) => {
  if (typeof valor !== 'string') {
    throw new AppError(
      `El campo ${campo} no es válido.`,
      400,
      'INVALID_CITIZEN_FILTER',
    );
  }

  return valor.trim();
};

const validarEntero = (valor, campo) => {
  if (!/^\d+$/.test(String(valor))) {
    throw new AppError(
      `El campo ${campo} no es válido.`,
      400,
      'INVALID_CITIZEN_PAGINATION',
    );
  }

  const numero = Number(valor);

  if (!Number.isSafeInteger(numero) || numero < 1) {
    throw new AppError(
      `El campo ${campo} no es válido.`,
      400,
      'INVALID_CITIZEN_PAGINATION',
    );
  }

  return numero;
};

// ==========================================================
// SERVICE: LISTADO ADMINISTRATIVO DE CIUDADANOS
// ==========================================================
module.exports = async function getCitizensPaginatedService({
  page = 1,
  limit = 10,
  search = '',
  estado_ciudadano = '',
  origen_registro = '',
} = {}) {
  const pagina = validarEntero(page, 'page');
  const limite = validarEntero(limit, 'limit');

  if (![5, 10, 20, 50].includes(limite)) {
    throw new AppError(
      'El límite seleccionado no está permitido.',
      400,
      'INVALID_CITIZEN_LIMIT',
    );
  }

  const offset = (pagina - 1) * limite;

  if (!Number.isSafeInteger(offset)) {
    throw new AppError(
      'La página seleccionada no es válida.',
      400,
      'INVALID_CITIZEN_PAGINATION',
    );
  }

  const busqueda = validarTexto(search, 'search');
  const estado = validarTexto(estado_ciudadano, 'estado_ciudadano');
  const origen = validarTexto(origen_registro, 'origen_registro');

  if (busqueda.length > 120) {
    throw new AppError(
      'La búsqueda admite hasta 120 caracteres.',
      400,
      'INVALID_CITIZEN_SEARCH',
    );
  }

  if (estado && !ESTADOS.includes(estado)) {
    throw new AppError(
      'El estado ciudadano no es válido.',
      400,
      'INVALID_CITIZEN_STATE',
    );
  }

  if (origen && !ORIGENES.includes(origen)) {
    throw new AppError(
      'El origen de registro no es válido.',
      400,
      'INVALID_CITIZEN_ORIGIN',
    );
  }

  const where = {};

  if (estado) {
    where.estado_ciudadano = estado;
  }

  if (origen) {
    where.origen_registro = origen;
  }

  if (busqueda) {
    where[Op.or] = [
      {
        '$usuario.persona.nombres$': {
          [Op.like]: `%${busqueda}%`,
        },
      },
      {
        '$usuario.persona.apellidos$': {
          [Op.like]: `%${busqueda}%`,
        },
      },
      {
        '$usuario.persona.numero_documento$': {
          [Op.like]: `%${busqueda}%`,
        },
      },
      {
        '$usuario.username$': {
          [Op.like]: `%${busqueda}%`,
        },
      },
    ];
  }

  const { rows, count } = await db.Ciudadano.findAndCountAll({
    attributes: [
      'id_ciudadano',
      'id_usuario',
      'estado_ciudadano',
      'origen_registro',
      'celular_verificado',
      'acepta_tratamiento_datos',
      'fecha_consentimiento',
      'version_consentimiento',
      'created_at',
    ],

    where,

    include: [
      {
        association: 'usuario',
        required: false,

        attributes: [
          'username',
          'email_acceso',
        ],

        include: [
          {
            association: 'persona',
            required: false,

            attributes: [
              'nombres',
              'apellidos',
              'tipo_documento',
              'numero_documento',
              'celular',
            ],
          },
        ],
      },
    ],

    // Solo se incluyen asociaciones belongsTo.
    subQuery: false,
    distinct: true,

    order: [
      ['created_at', 'DESC'],
      ['id_ciudadano', 'DESC'],
    ],

    offset,
    limit: limite,
  });

  const items = rows.map(modelo => {
    const ciudadano = modelo.get({ plain: true });
    const usuario = ciudadano.usuario;
    const persona = usuario?.persona;

    return {
      id_ciudadano: ciudadano.id_ciudadano,
      id_usuario: ciudadano.id_usuario,

      nombres: persona?.nombres ?? null,
      apellidos: persona?.apellidos ?? null,

      tipo_documento: persona?.tipo_documento ?? null,
      numero_documento: persona?.numero_documento ?? null,

      celular: persona?.celular ?? null,
      email_acceso: usuario?.email_acceso ?? null,
      username: usuario?.username ?? null,

      estado_ciudadano: ciudadano.estado_ciudadano,
      origen_registro: ciudadano.origen_registro,

      celular_verificado: ciudadano.celular_verificado,

      acepta_tratamiento_datos:        ciudadano.acepta_tratamiento_datos,

      fecha_consentimiento: ciudadano.fecha_consentimiento,
      version_consentimiento: ciudadano.version_consentimiento,

      fecha_registro: ciudadano.created_at,
    };
  });

  return {
    items,

    pagination: {
      page: pagina,
      limit: limite,
      total: count,
      total_pages: Math.ceil(count / limite),
    },
  };
};