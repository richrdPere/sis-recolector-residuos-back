const db = require('../../../database/models');

// Validations
const {
  validateId,
  normalizeLocation,
} = require(
  '../validations/tracking.validation',
);

// Utils
const {
  getRecorridoOrFail,
  assertTrackingTransmitter,
  assertRecorridoAllowsTracking,
  updateLastLocation,
} = require(
  '../utils/tracking-service.utils',
);

// Modelos
const {
  RecorridoPosicion,
  sequelize,
} = db;

// ===============================================
// Service: Registrar ubicación
// ===============================================
const registerLocationService = async (payload,
  {
    id_usuario,
    origen = 'MOVIL',
  },
) => {
  const recorridoId =
    validateId(
      payload.id_recorrido,
      'identificador del recorrido',
    );

  const usuarioId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const location =
    normalizeLocation(
      payload,
    );

  /*
  | Primero comprobamos la idempotencia sin
  | abrir una transacción.
  */

  const existingPosition =
    await RecorridoPosicion
      .findOne({
        where: {
          clave_idempotencia:
            location
              .clave_idempotencia,
        },
      });

  if (existingPosition) {
    return {
      posicion:
        existingPosition,

      duplicada:
        true,

      ultima_ubicacion_actualizada:
        false,
    };
  }

  const transaction =
    await sequelize.transaction();

  try {
    /*
    | Bloquear el recorrido serializa las
    | posiciones concurrentes del mismo recorrido.
    */

    const recorrido =
      await getRecorridoOrFail(
        recorridoId,
        {
          transaction,
          lock: true,
        },
      );

    assertRecorridoAllowsTracking(
      recorrido,
    );

    await assertTrackingTransmitter({
      recorrido,

      id_usuario:
        usuarioId,

      transaction,
    });

    /*
    | Las posiciones simuladas se conservan
    | para auditoría, pero se marcan inválidas.
    */

    const isValid =
      !location
        .es_ubicacion_simulada;

    const invalidReason =
      location
        .es_ubicacion_simulada
        ? 'La ubicación fue reportada como simulada por el dispositivo.'
        : null;

    const receptionDate =
      new Date();

    const posicion =
      await RecorridoPosicion
        .create(
          {
            id_recorrido:
              recorridoId,

            id_usuario:
              usuarioId,

            ...location,

            fecha_recepcion:
              receptionDate,

            es_valida:
              isValid,

            motivo_invalidez:
              invalidReason,

            origen,
          },
          {
            transaction,
          },
        );

    const {
      updated,
      lastLocation,
    } =
      await updateLastLocation({
        posicion,
        transaction,
      });

    await transaction.commit();

    return {
      posicion,

      duplicada:
        false,

      ultima_ubicacion_actualizada:
        updated,

      ultima_ubicacion:
        lastLocation,
    };
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction
        .rollback();
    }

    /*
    | Dos solicitudes simultáneas podrían superar
    | la primera búsqueda. El índice UNIQUE es la
    | última protección.
    */

    if (
      error.name ===
      'SequelizeUniqueConstraintError'
    ) {
      const duplicatedPosition =
        await RecorridoPosicion
          .findOne({
            where: {
              clave_idempotencia:
                location
                  .clave_idempotencia,
            },
          });

      if (
        duplicatedPosition
      ) {
        return {
          posicion:
            duplicatedPosition,

          duplicada:
            true,

          ultima_ubicacion_actualizada:
            false,
        };
      }
    }

    throw error;
  }
};

module.exports = registerLocationService;