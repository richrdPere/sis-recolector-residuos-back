const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
  normalizeLocation,
} = require('../validations/tracking.validation');

// Utils
const {
  getRecorridoOrFail,
  assertTrackingTransmitter,
  assertRecorridoAllowsTracking,
  updateLastLocation,
} = require('../utils/tracking-service.utils');

// Modelos
const {
  RecorridoPosicion,
  sequelize,
} = db;

// ==========================================================
// VALIDAR Y DEVOLVER UNA POSICIÓN DUPLICADA
// ==========================================================
const buildDuplicateResult = (
  posicion,
  recorridoId,
  usuarioId,
) => {
  const mismoRecorrido =
    String(posicion.id_recorrido) === String(recorridoId);

  const mismoUsuario =
    String(posicion.id_usuario) === String(usuarioId);

  if (!mismoRecorrido || !mismoUsuario) {
    throw new AppError(
      'La clave de idempotencia ya está asociada a otra operación.',
      409,
      'TRACKING_IDEMPOTENCY_CONFLICT',
    );
  }

  return {
    posicion,
    duplicada: true,
    ultima_ubicacion_actualizada: false,
  };
};

// ==========================================================
// SERVICE: REGISTRAR UBICACIÓN
// ==========================================================
const registerLocationService = async (
  payload,
  {
    id_usuario,
    origen = 'MOVIL',
  },
) => {
  const recorridoId = validateId(
    payload.id_recorrido,
    'identificador del recorrido',
  );

  const usuarioId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const location = normalizeLocation(payload);

  // 1. COMPROBAR IDEMPOTENCIA
  const existingPosition = await RecorridoPosicion.findOne({
    where: {
      clave_idempotencia: location.clave_idempotencia,
    },
  });

  if (existingPosition) {
    return buildDuplicateResult(
      existingPosition,
      recorridoId,
      usuarioId,
    );
  }

  const transaction = await sequelize.transaction();

  try {
    // 2. BLOQUEAR Y VALIDAR RECORRIDO
    const recorrido = await getRecorridoOrFail(
      recorridoId,
      {
        transaction,
        lock: true,
      },
    );

    assertRecorridoAllowsTracking(recorrido);

    // 3. VALIDAR CONDUCTOR AUTENTICADO
    await assertTrackingTransmitter({
      recorrido,
      id_usuario: usuarioId,
      transaction,
    });

    // 4. REGISTRAR POSICIÓN HISTÓRICA
    // Las posiciones simuladas quedan para auditoría,
    // pero no reemplazan la última ubicación válida.
    const isValid = !location.es_ubicacion_simulada;

    const invalidReason = location.es_ubicacion_simulada
      ? 'La ubicación fue reportada como simulada por el dispositivo.'
      : null;

    const posicion = await RecorridoPosicion.create(
      {
        ...location,

        id_recorrido: recorridoId,
        id_usuario: usuarioId,

        fecha_recepcion: new Date(),
        es_valida: isValid,
        motivo_invalidez: invalidReason,
        origen,
      },
      {
        transaction,
      },
    );
    

    // 5. ACTUALIZAR ÚLTIMA UBICACIÓN
    const {
      updated,
      lastLocation,
    } = await updateLastLocation({
      posicion,
      transaction,
    });

    // Los hooks publicarán después del commit.
    await transaction.commit();

    return {
      posicion,
      duplicada: false,
      ultima_ubicacion_actualizada: updated,
      ultima_ubicacion: lastLocation,
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    // 6. RECUPERAR DUPLICADO POR SOLICITUDES CONCURRENTES
    if (error.name === 'SequelizeUniqueConstraintError') {
      const duplicatedPosition =
        await RecorridoPosicion.findOne({
          where: {
            clave_idempotencia: location.clave_idempotencia,
          },
        });

      if (duplicatedPosition) {
        return buildDuplicateResult(
          duplicatedPosition,
          recorridoId,
          usuarioId,
        );
      }
    }

    throw error;
  }
};

module.exports = registerLocationService;
