const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/tracking.validation');

// Service
const registerLocationService = require('./register-location.service');

// ===============================================
// Service: Registrar ubicaciones por lote
// ===============================================
const registerLocationBatchService = async (
  {
    id_recorrido,
    ubicaciones,
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
      ubicaciones,
    ) ||
    !ubicaciones.length
  ) {
    throw new AppError(
      'Debe enviar al menos una ubicación.',
      400,
      'LOCATIONS_REQUIRED',
    );
  }

  if (
    ubicaciones.length >
    500
  ) {
    throw new AppError(
      'No se pueden procesar más de 500 ubicaciones por lote.',
      400,
      'LOCATION_BATCH_LIMIT_EXCEEDED',
    );
  }

  /*
  | Ordenamos por fecha del dispositivo para
  | mantener una secuencia lógica.
  */

  const orderedLocations = [
    ...ubicaciones,
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

  /*
  | Cada ubicación utiliza su propia transacción.
  | Así, una posición inválida no impide guardar
  | las demás posiciones del lote.
  */

  for (
    let index = 0;
    index <
    orderedLocations.length;
    index += 1
  ) {
    const location =
      orderedLocations[index];

    try {
      const result =
        await registerLocationService(
          {
            ...location,

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
          location
            .clave_idempotencia ??
          null,

        estado:
          result.duplicada
            ? 'DUPLICADA'
            : 'REGISTRADA',

        id_posicion:
          result
            .posicion
            .id_posicion,
      });
    } catch (error) {
      rejected += 1;

      results.push({
        index,

        clave_idempotencia:
          location
            .clave_idempotencia ??
          null,

        estado:
          'RECHAZADA',

        codigo:
          error.code ||
          'LOCATION_REJECTED',

        mensaje:
          error.message,
      });
    }
  }

  return {
    recibidas: ubicaciones.length,
    registradas: registered,
    duplicadas: duplicated,
    rechazadas: rejected,
    resultados: results,
  };
};

module.exports = registerLocationBatchService;