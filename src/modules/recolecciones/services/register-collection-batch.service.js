'use strict';

const AppError = require('../../../utils/app-error');

const { validateId } = require('../validations/recoleccion.validation');

const registerCollectionService = require('./register-collection.service',);

// ==========================================================
// REGISTRAR LOTE DE ATENCIONES U OMISIONES
// ==========================================================

const registerCollectionBatchService = async (
  payload,
  metadata,
) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new AppError(
      'El lote debe ser un objeto.',
      400,
      'INVALID_COLLECTION_BATCH',
    );
  }

  const recorridoId = validateId(
    payload.id_recorrido,
    'identificador del recorrido',
  );

  const items = payload.recolecciones;

  if (
    !Array.isArray(items) ||
    !items.length
  ) {
    throw new AppError(
      'Debe enviar al menos una decisión de punto.',
      400,
      'COLLECTIONS_REQUIRED',
    );
  }

  if (items.length > 200) {
    throw new AppError(
      'No se pueden procesar más de 200 decisiones por lote.',
      400,
      'COLLECTION_BATCH_LIMIT_EXCEEDED',
    );
  }

  // Procesar por fecha sin perder el índice original.
  // Los elementos malformados se rechazan individualmente.
  const ordered = items
    .map((item, index) => {
      const parsed =
        typeof item?.fecha_dispositivo === 'string'
          ? Date.parse(item.fecha_dispositivo)
          : NaN;

      return {
        item,
        index,
        timestamp: Number.isFinite(parsed)
          ? parsed
          : Infinity,
      };
    })
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp ||
        a.index - b.index,
    );

  const resultados = [];

  let registradas = 0;
  let duplicadas = 0;
  let rechazadas = 0;

  for (const { item, index } of ordered) {
    try {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item)
      ) {
        throw new AppError(
          'La decisión debe ser un objeto.',
          400,
          'INVALID_COLLECTION_PAYLOAD',
        );
      }

      const result = await registerCollectionService(
        {
          ...item,
          id_recorrido: recorridoId,
        },
        metadata,
      );

      if (result.duplicada) {
        duplicadas++;
      } else {
        registradas++;
      }

      resultados.push({
        index,

        clave_idempotencia:
          item.clave_idempotencia,

        estado: result.duplicada
          ? 'DUPLICADA'
          : 'REGISTRADA',

        resultado_atencion:
          result.recoleccion.resultado_atencion,

        id_recoleccion:
          result.recoleccion.id_recoleccion,
      });
    } catch (error) {
      rechazadas++;

      const expected = error instanceof AppError;

      resultados.push({
        index,

        clave_idempotencia:
          typeof item?.clave_idempotencia === 'string'
            ? item.clave_idempotencia
            : null,

        estado: 'RECHAZADA',

        codigo: expected
          ? error.code
          : 'COLLECTION_REJECTED',

        mensaje: expected
          ? error.message
          : 'No se pudo registrar la decisión del punto.',
      });
    }
  }

  return {
    recibidas: items.length,
    registradas,
    duplicadas,
    rechazadas,
    resultados,
  };
};

module.exports = registerCollectionBatchService;

// // services/register-collection-batch.service.js

// const AppError = require('../../../utils/app-error');

// // Validations
// const { validateId } = require('../validations/recoleccion.validation');

// // Services
// const registerCollectionService = require('./register-collection.service');

// // ===============================================
// // Services: Register colleccion OFFLINE
// // ===============================================
// const registerCollectionBatchService =
//   async (
//     {
//       id_recorrido,
//       recolecciones,
//     },
//     metadata,
//   ) => {
//     const recorridoId =
//       validateId(
//         id_recorrido,
//         'identificador del recorrido',
//       );

//     if (
//       !Array.isArray(
//         recolecciones,
//       ) ||
//       !recolecciones.length
//     ) {
//       throw new AppError(
//         'Debe enviar al menos una recolección.',
//         400,
//         'COLLECTIONS_REQUIRED',
//       );
//     }

//     if (
//       recolecciones.length >
//       200
//     ) {
//       throw new AppError(
//         'No se pueden procesar más de 200 recolecciones por lote.',
//         400,
//         'COLLECTION_BATCH_LIMIT_EXCEEDED',
//       );
//     }

//     const orderedCollections = [
//       ...recolecciones,
//     ].sort(
//       (
//         first,
//         second,
//       ) =>
//         new Date(
//           first
//             .fecha_dispositivo,
//         ).getTime() -
//         new Date(
//           second
//             .fecha_dispositivo,
//         ).getTime(),
//     );

//     const results = [];

//     let registered = 0;
//     let duplicated = 0;
//     let rejected = 0;

//     for (
//       let index = 0;
//       index <
//       orderedCollections.length;
//       index += 1
//     ) {
//       const item =
//         orderedCollections[index];

//       try {
//         const result =
//           await registerCollectionService(
//             {
//               ...item,

//               id_recorrido:
//                 recorridoId,
//             },

//             metadata,
//           );

//         if (
//           result.duplicada
//         ) {
//           duplicated += 1;
//         } else {
//           registered += 1;
//         }

//         results.push({
//           index,

//           clave_idempotencia:
//             item
//               .clave_idempotencia,

//           estado:
//             result.duplicada
//               ? 'DUPLICADA'
//               : 'REGISTRADA',

//           id_recoleccion:
//             result
//               .recoleccion
//               .id_recoleccion,
//         });
//       } catch (error) {
//         rejected += 1;

//         results.push({
//           index,

//           clave_idempotencia:
//             item
//               .clave_idempotencia ??
//             null,

//           estado:
//             'RECHAZADA',

//           codigo:
//             error.code ||
//             'COLLECTION_REJECTED',

//           mensaje:
//             error.message,
//         });
//       }
//     }

//     return {
//       recibidas: recolecciones.length,
//       registradas: registered,
//       duplicadas: duplicated,
//       rechazadas: rejected,
//       resultados: results,
//     };
//   };

// module.exports = registerCollectionBatchService;