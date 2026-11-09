'use strict';

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { validateId } = require('../validations/recoleccion.validation');

const consultar = async (
  id,
  transaction,
) => {
  const recorrido = await db.Recorrido.findByPk(
    id,
    { transaction },
  );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  const programacion = await db.ProgramacionRuta.findByPk(
    recorrido.id_programacion,
    { transaction },
  );

  if (!programacion) {
    throw new AppError(
      'La programación asociada no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  const points = await db.RutaPunto.findAll({
    where: {
      id_ruta_version: programacion.id_ruta_version,
      estado: true,
      tipo_punto: 'RECOLECCION',
    },

    order: [
      ['orden', 'ASC'],
      ['id_ruta_punto', 'ASC'],
    ],

    transaction,
  });

  const collections = await db.RecoleccionPunto.findAll({
    where: {
      id_recorrido: id,
      estado_recoleccion: 'REGISTRADA',
    },

    include: [
      {
        association: 'usuario_registro',

        attributes: [
          'id_usuario',
          'username',
        ],

        required: false,
      },
    ],

    transaction,
  });

  const ids = new Set(
    points.map(
      (point) => String(point.id_ruta_punto),
    ),
  );

  const porPunto = new Map();

  for (const collection of collections) {
    const data = collection.get({
      plain: true,
    });

    const key = String(data.id_ruta_punto);

    // Ignorar registros que no correspondan a los
    // puntos de recolección actuales de esta versión.
    if (!ids.has(key)) continue;

    if (porPunto.has(key)) {
      throw new AppError(
        'Hay más de una decisión vigente para un punto. Revisa los registros.',
        409,
        'COLLECTION_POINT_DUPLICATED',
      );
    }

    if (
      ![
        'ATENDIDO',
        'OMITIDO',
      ].includes(data.resultado_atencion)
    ) {
      throw new AppError(
        'Hay un resultado de atención inválido.',
        409,
        'INVALID_STORED_ATTENTION',
      );
    }

    porPunto.set(key, data);
  }

  return points.map((point) => {
    const data = point.get({
      plain: true,
    });

    const recoleccion =
      porPunto.get(
        String(data.id_ruta_punto),
      ) || null;

    return {
      ...data,

      estado_atencion:
        recoleccion?.resultado_atencion ||
        'PENDIENTE',

      recoleccion,
    };
  });
};

module.exports = async (
  idRecorrido,
  {
    transaction = null,
  } = {},
) => {
  const id = validateId(
    idRecorrido,
    'identificador del recorrido',
  );

  if (transaction) {
    return consultar(id, transaction);
  }

  return db.sequelize.transaction(
    {
      isolationLevel: 'REPEATABLE READ',
    },
    (tx) => consultar(id, tx),
  );
};

// // services/get-route-collection-points.service.js

// const { Op } = require('sequelize');
// const db = require('../../../database/models');
// const AppError = require('../../../utils/app-error');

// // Validation
// const { validateId } = require('../validations/recoleccion.validation');

// // Modelos
// const {
//   Recorrido,
//   ProgramacionRuta,
//   RutaPunto,
//   RecoleccionPunto,
// } = db;

// // ===============================================
// // Services: Obtener puntos de ruta de recoleccion
// // ===============================================
// const getRouteCollectionPointsService = async (idRecorrido) => {
//   const recorridoId =
//     validateId(
//       idRecorrido,
//       'identificador del recorrido',
//     );

//   const recorrido =
//     await Recorrido.findByPk(
//       recorridoId,
//     );

//   if (!recorrido) {
//     throw new AppError(
//       'El recorrido no fue encontrado.',
//       404,
//       'ROUTE_JOURNEY_NOT_FOUND',
//     );
//   }

//   const programacion =
//     await ProgramacionRuta
//       .findByPk(
//         recorrido
//           .id_programacion,
//       );

//   if (!programacion) {
//     throw new AppError(
//       'La programación asociada no fue encontrada.',
//       404,
//       'PROGRAMMING_NOT_FOUND',
//     );
//   }

//   const [
//     points,
//     collections,
//   ] =
//     await Promise.all([
//       RutaPunto.findAll({
//         where: {
//           id_ruta_version:
//             programacion
//               .id_ruta_version,

//           estado:
//             true,
//         },

//         order: [
//           [
//             'id_ruta_punto',
//             'ASC',
//           ],
//         ],
//       }),

//       RecoleccionPunto
//         .findAll({
//           where: {
//             id_recorrido:
//               recorridoId,

//             estado_recoleccion:
//               'REGISTRADA',

//             id_ruta_punto: {
//               [Op.ne]:
//                 null,
//             },
//           },
//         }),
//     ]);

//   const collectionMap =
//     new Map(
//       collections.map(
//         (
//           collection,
//         ) => [
//             String(
//               collection
//                 .id_ruta_punto,
//             ),

//             collection,
//           ],
//       ),
//     );

//   return points.map(
//     (
//       point,
//     ) => {
//       const plainPoint =
//         point.get({
//           plain:
//             true,
//         });

//       const collection =
//         collectionMap.get(
//           String(
//             point
//               .id_ruta_punto,
//           ),
//         );

//       return {
//         ...plainPoint,

//         estado_atencion:
//           collection
//             ? 'ATENDIDO'
//             : 'PENDIENTE',

//         recoleccion:
//           collection ||
//           null,
//       };
//     },
//   );
// };

// module.exports = getRouteCollectionPointsService;