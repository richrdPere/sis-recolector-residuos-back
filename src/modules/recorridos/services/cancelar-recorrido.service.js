const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Constants
const {
  ESTADOS_RECORRIDO,
  ESTADOS_PROGRAMACION,
  ESTADOS_VEHICULO,
  ESTADOS_RECORRIDO_ACTIVO,
  TIPOS_EVENTO_RECORRIDO,
} = require('../utils/recorrido.constants');

// Validations
const {
  validateId,
  validateCoordinates,
  validateEventDate,
  validateIdempotencyKey,
  normalizeOrigin,
  validateObservation,
} = require('../validations/recorrido.validation'
);

// Utils
const {
  getRecorridoOrFail,
  getProgramacionOrFail,
  getVehiculoOrFail,
  createRecorridoEvent,
  getRecorridoDetail,
} = require(
  '../utils/recorrido-service.utils',
);

// Modelos
const {
  sequelize,
} = db;

// =======================================================
// Service: Cancelar recorrido
// =======================================================
const cancelarRecorridoService = async ({
  id_recorrido,
  id_usuario,
  motivo,
  fecha_evento = null,
  latitud = null,
  longitud = null,
  observacion = null,
  clave_idempotencia = null,
  origen = 'WEB',
  ip = null,
  user_agent = null,
}) => {
  const recorridoId =
    validateId(
      id_recorrido,
      'identificador del recorrido',
    );

  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const normalizedReason =
    validateObservation(
      motivo,
      true,
    );

  const location =
    validateCoordinates({
      latitud,
      longitud,
    });

  const eventDate =
    validateEventDate(
      fecha_evento,
    );

  const transaction =
    await sequelize.transaction();

  try {
    const recorrido =
      await getRecorridoOrFail(
        recorridoId,
        transaction,
        true,
      );

    if (
      !ESTADOS_RECORRIDO_ACTIVO
        .includes(
          recorrido.estado_recorrido,
        )
    ) {
      throw new AppError(
        'El recorrido no se encuentra activo.',
        409,
        'ROUTE_EXECUTION_CANNOT_CANCEL',
      );
    }

    const programacion =
      await getProgramacionOrFail(
        recorrido.id_programacion,
        transaction,
        true,
      );

    const vehiculo =
      await getVehiculoOrFail(
        programacion.id_vehiculo,
        transaction,
        true,
      );

    await recorrido.update(
      {
        id_usuario_finalizacion:
          userId,

        estado_recorrido:
          ESTADOS_RECORRIDO
            .CANCELADO,

        fecha_hora_finalizacion:
          eventDate,

        motivo_cancelacion:
          normalizedReason,
      },
      {
        transaction,
      },
    );

    await programacion.update(
      {
        estado_programacion:
          ESTADOS_PROGRAMACION
            .CANCELADA,
      },
      {
        transaction,
      },
    );

    await vehiculo.update(
      {
        estado_operativo:
          ESTADOS_VEHICULO
            .DISPONIBLE,
      },
      {
        transaction,
      },
    );

    await createRecorridoEvent({
      id_recorrido:
        recorridoId,
      id_usuario:
        userId,
      tipo_evento:
        TIPOS_EVENTO_RECORRIDO
          .CANCELACION,
      fecha_evento:
        eventDate,
      latitud:
        location.latitud,
      longitud:
        location.longitud,
      observacion:
        normalizedReason,
      clave_idempotencia:
        validateIdempotencyKey(
          clave_idempotencia,
        ),
      origen:
        normalizeOrigin(origen),
      ip,
      user_agent,
      transaction,
    });

    await transaction.commit();

    return getRecorridoDetail(
      recorridoId,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = cancelarRecorridoService;