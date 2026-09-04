// services/register-collection-batch.service.js

const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recoleccion.validation');

// Services
const registerCollectionService = require('./register-collection.service');

// ===============================================
// Services: Register colleccion OFFLINE
// ===============================================
const registerCollectionBatchService =
  async (
    {
      id_recorrido,
      recolecciones,
    },
    metadata,
  ) => {
    const recorridoId =
      validateId(
        id_recorrido,
        'identificador del recorrido',
      );

    if (
      !Array.isArray(
        recolecciones,
      ) ||
      !recolecciones.length
    ) {
      throw new AppError(
        'Debe enviar al menos una recolección.',
        400,
        'COLLECTIONS_REQUIRED',
      );
    }

    if (
      recolecciones.length >
      200
    ) {
      throw new AppError(
        'No se pueden procesar más de 200 recolecciones por lote.',
        400,
        'COLLECTION_BATCH_LIMIT_EXCEEDED',
      );
    }

    const orderedCollections = [
      ...recolecciones,
    ].sort(
      (
        first,
        second,
      ) =>
        new Date(
          first
            .fecha_dispositivo,
        ).getTime() -
        new Date(
          second
            .fecha_dispositivo,
        ).getTime(),
    );

    const results = [];

    let registered = 0;
    let duplicated = 0;
    let rejected = 0;

    for (
      let index = 0;
      index <
      orderedCollections.length;
      index += 1
    ) {
      const item =
        orderedCollections[index];

      try {
        const result =
          await registerCollectionService(
            {
              ...item,

              id_recorrido:
                recorridoId,
            },

            metadata,
          );

        if (
          result.duplicada
        ) {
          duplicated += 1;
        } else {
          registered += 1;
        }

        results.push({
          index,

          clave_idempotencia:
            item
              .clave_idempotencia,

          estado:
            result.duplicada
              ? 'DUPLICADA'
              : 'REGISTRADA',

          id_recoleccion:
            result
              .recoleccion
              .id_recoleccion,
        });
      } catch (error) {
        rejected += 1;

        results.push({
          index,

          clave_idempotencia:
            item
              .clave_idempotencia ??
            null,

          estado:
            'RECHAZADA',

          codigo:
            error.code ||
            'COLLECTION_REJECTED',

          mensaje:
            error.message,
        });
      }
    }

    return {
      recibidas: recolecciones.length,
      registradas: registered,
      duplicadas: duplicated,
      rechazadas: rejected,
      resultados: results,
    };
  };

module.exports = registerCollectionBatchService;