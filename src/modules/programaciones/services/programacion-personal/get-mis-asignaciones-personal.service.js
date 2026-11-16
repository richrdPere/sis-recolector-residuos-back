const { Op, fn, col, where } = require('sequelize');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

const {
  validateId,
  validateDateOnly,
} = require('../../validations/programacion.validation');

// ==========================================================
// NORMALIZACIÓN DE FILTROS
// ==========================================================

const texto = (value, nombre, maximo = 100) => {
  if (value == null || value === '') return '';

  if (
    typeof value !== 'string' ||
    value.trim().length > maximo
  ) {
    throw new AppError(
      `${nombre} no es válido.`,
      400,
      'INVALID_FILTER',
    );
  }

  return value.trim();
};

const entero = (
  value,
  defecto,
  maximo,
  nombre,
) => {
  const numero =
    value == null || value === ''
      ? defecto
      : Number(value);

  if (
    !['number', 'string', 'undefined'].includes(
      typeof value,
    ) ||
    !Number.isSafeInteger(numero) ||
    numero < 1 ||
    numero > maximo
  ) {
    throw new AppError(
      `${nombre} no es válido.`,
      400,
      'INVALID_PAGINATION',
    );
  }

  return numero;
};

const booleano = (value) => {
  if (
    value == null ||
    value === '' ||
    value === false ||
    value === 'false' ||
    value === '0'
  ) {
    return false;
  }

  if (
    value === true ||
    value === 'true' ||
    value === '1'
  ) {
    return true;
  }

  throw new AppError(
    'solo_anteriores no es válido.',
    400,
    'INVALID_FILTER',
  );
};

const hoyPeru = () => {
  const partes = new Intl.DateTimeFormat(
    'en-US',
    {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).formatToParts(new Date());

  const leer = (tipo) =>
    partes.find(
      (parte) => parte.type === tipo,
    ).value;

  return (
    `${leer('year')}-` +
    `${leer('month')}-` +
    `${leer('day')}`
  );
};

// ==========================================================
// OBTENER ASIGNACIONES DEL USUARIO AUTENTICADO
// ==========================================================

const getMisAsignacionesService = async ({
  id_usuario,

  page = 1,
  limit = 10,

  search = '',
  solo_anteriores = false,

  estado_asignacion = '',
  estado_programacion = '',

  fecha_desde = '',
  fecha_hasta = '',
}) => {
  const userId = validateId(
    id_usuario,
    'usuario',
  );

  const pagina = entero(
    page,
    1,
    1_000_000,
    'La página',
  );

  const limite = entero(
    limit,
    10,
    100,
    'El límite',
  );

  const busqueda = texto(
    search,
    'La búsqueda',
  );

  const anteriores = booleano(
    solo_anteriores,
  );

  const asignacion = texto(
    estado_asignacion,
    'El estado de asignación',
    40,
  );

  const estado = texto(
    estado_programacion,
    'El estado de programación',
    40,
  );

  const desdeTexto = texto(
    fecha_desde,
    'La fecha inicial',
    10,
  );

  const hastaTexto = texto(
    fecha_hasta,
    'La fecha final',
    10,
  );

  const desde = desdeTexto
    ? validateDateOnly(
      desdeTexto,
      'fecha inicial',
    )
    : null;

  const hasta = hastaTexto
    ? validateDateOnly(
      hastaTexto,
      'fecha final',
    )
    : null;

  if (
    desde &&
    hasta &&
    desde > hasta
  ) {
    throw new AppError(
      'El rango de fechas no es válido.',
      400,
      'INVALID_DATE_RANGE',
    );
  }

  const personal =
    await db.PersonalOperativo.findOne({
      where: {
        id_usuario: userId,
        estado: true,
      },
    });

  if (!personal) {
    throw new AppError(
      'El usuario no tiene un perfil laboral activo.',
      403,
      'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
    );
  }

  // El alcance siempre se obtiene del usuario autenticado.
  const filtroPersonal = {
    id_personal: personal.id_personal,
  };

  const filtroProgramacion = {};

  if (asignacion) {
    filtroPersonal.estado_asignacion =
      asignacion.toUpperCase();
  }

  if (estado) {
    filtroProgramacion.estado_programacion =
      estado.toUpperCase();
  }

  const fechas = {};

  if (desde) {
    fechas[Op.gte] = desde;
  }

  if (hasta) {
    fechas[Op.lte] = hasta;
  }

  if (anteriores) {
    fechas[Op.lt] = hoyPeru();
  }

  if (Reflect.ownKeys(fechas).length) {
    filtroProgramacion.fecha_programada =
      fechas;
  }

  // Buscar antes de paginar, sobre todas las asignaciones propias.
  if (busqueda) {
    const contiene = (campo) =>
      where(
        fn(
          'LOCATE',
          busqueda.toLowerCase(),
          fn('LOWER', col(campo)),
        ),
        {
          [Op.gt]: 0,
        },
      );

    filtroPersonal[Op.or] = [
      contiene(
        'programacion.ruta.nombre',
      ),

      contiene(
        'programacion.ruta.codigo',
      ),

      contiene(
        'programacion.vehiculo.placa',
      ),

      ...(/^\d+$/.test(busqueda)
        ? [
          {
            id_programacion: busqueda,
          },
        ]
        : []),
    ];
  }

  const { count, rows } =
    await db.ProgramacionPersonal.findAndCountAll({
      where: filtroPersonal,

      include: [
        {
          association: 'programacion',
          required: true,
          where: filtroProgramacion,

          include: [
            {
              association: 'ruta',
              required: true,
            },
            {
              association: 'version_ruta',
            },
            {
              association: 'vehiculo',
              required: true,
            },
          ],
        },
      ],

      distinct: true,
      col: 'id_programacion_personal',

      // Las asociaciones incluidas son belongsTo.
      subQuery: false,

      limit: limite,
      offset: (pagina - 1) * limite,

      order: [
        [
          {
            model: db.ProgramacionRuta,
            as: 'programacion',
          },
          'fecha_programada',
          'DESC',
        ],
        [
          {
            model: db.ProgramacionRuta,
            as: 'programacion',
          },
          'hora_inicio_programada',
          'DESC',
        ],
        [
          'id_programacion_personal',
          'DESC',
        ],
      ],
    });

  return {
    items: rows,

    pagination: {
      total: count,
      page: pagina,
      limit: limite,
      total_pages: Math.ceil(
        count / limite,
      ),
    },
  };
};

module.exports = getMisAsignacionesService;

// const { Op } = require('sequelize');
// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Modelos
// const {
//   ProgramacionRuta,
//   ProgramacionPersonal,
//   PersonalOperativo,
// } = db;


// // ===============================================
// // SERVICE: Obtener mis asignaciones
// // ===============================================
// const getMisAsignacionesService = async ({
//   id_usuario,
//   page = 1,
//   limit = 10,
// }) => {
//   const personal =
//     await PersonalOperativo
//       .findOne({
//         where: {
//           id_usuario,
//           estado: true,
//         },
//       });

//   if (!personal) {
//     throw new AppError(
//       'El usuario no tiene un perfil laboral activo.',
//       403,
//       'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
//     );
//   }

//   const currentPage = Number(page);
//   const currentLimit = Number(limit);
//   const {

//     count, rows } =
//     await ProgramacionPersonal
//       .findAndCountAll({
//         where: {
//           id_personal:
//             personal.id_personal,
//         },

//         include: [
//           {
//             association:
//               'programacion',

//             include: [
//               {
//                 association:
//                   'ruta',
//               },
//               {
//                 association:
//                   'version_ruta',
//               },
//               {
//                 association:
//                   'vehiculo',
//               },
//             ],
//           },
//         ],

//         limit: currentLimit,

//         offset:
//           (
//             currentPage - 1
//           ) * currentLimit,

//         order: [
//           [
//             {
//               model:
//                 ProgramacionRuta,

//               as:
//                 'programacion',
//             },
//             'fecha_programada',
//             'DESC',
//           ],
//         ],
//       });

//   return {
//     items: rows,

//     pagination: {
//       total: count,
//       page: currentPage,
//       limit: currentLimit,

//       total_pages:
//         Math.ceil(
//           count /
//           currentLimit,
//         ),
//     },
//   };
// };

// module.exports = getMisAsignacionesService;