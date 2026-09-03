const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Constants
const {
  ESTADOS_RECORRIDO,
  ESTADOS_PROGRAMACION,
  ESTADOS_VEHICULO,
  TIPOS_EVENTO_RECORRIDO,
} = require('../utils/recorrido.constants');

// Validations
const {
  validateId,
  validateCoordinates,
  validatePrecision,
  validateMileage,
  validateEventDate,
  validateIdempotencyKey,
  normalizeOrigin,
  validateObservation,
} = require('../validations/recorrido.validation');

// Utils
const {
  getRecorridoOrFail,
  getProgramacionOrFail,
  getVehiculoOrFail,
  assertAssignedDriver,
  createRecorridoEvent,
  findIdempotentEvent,
  getRecorridoDetail,
} = require(
  '../utils/recorrido-service.utils',
);

// Modelos
const {
  sequelize,
} = db;

// =======================================================
// Service: Finalizar recorrido
// =======================================================
const finalizarRecorridoService = async ({
  id_recorrido,
  id_usuario,
  fecha_evento = null,
  latitud,
  longitud,
  precision_gps = null,
  kilometraje = null,
  observacion = null,
  clave_idempotencia = null,
  origen = 'APP',
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

  const location =
    validateCoordinates({
      latitud,
      longitud,
      required: true,
    });

  const eventDate =
    validateEventDate(
      fecha_evento,
    );

  const finalMileage =
    validateMileage(
      kilometraje,
      'kilometraje final',
    );

  const idempotencyKey =
    validateIdempotencyKey(
      clave_idempotencia,
    );

  const previousEvent =
    await findIdempotentEvent({
      clave_idempotencia:
        idempotencyKey,

      tipo_evento:
        TIPOS_EVENTO_RECORRIDO
          .FINALIZACION,

      id_usuario:
        userId,
    });

  if (previousEvent) {
    return getRecorridoDetail(
      previousEvent.id_recorrido,
    );
  }

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
      recorrido.estado_recorrido !==
      ESTADOS_RECORRIDO.EN_CURSO
    ) {
      throw new AppError(
        'Solo se puede finalizar un recorrido en curso.',
        409,
        'ROUTE_EXECUTION_CANNOT_FINISH',
      );
    }

    await assertAssignedDriver({
      id_programacion:
        recorrido.id_programacion,

      id_usuario:
        userId,

      transaction,
    });

    if (
      finalMileage !== null &&
      recorrido.kilometraje_inicio !==
      null &&
      finalMileage <
      Number(
        recorrido.kilometraje_inicio,
      )
    ) {
      throw new AppError(
        'El kilometraje final no puede ser menor al inicial.',
        400,
        'FINAL_MILEAGE_BELOW_INITIAL',
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

    const durationSeconds =
      Math.max(
        0,
        Math.floor(
          (
            eventDate.getTime() -
            new Date(
              recorrido
                .fecha_hora_inicio,
            ).getTime()
          ) / 1000,
        ),
      );

    await recorrido.update(
      {
        id_usuario_finalizacion:
          userId,

        estado_recorrido:
          ESTADOS_RECORRIDO
            .FINALIZADO,

        fecha_hora_finalizacion:
          eventDate,

        latitud_finalizacion:
          location.latitud,

        longitud_finalizacion:
          location.longitud,

        precision_finalizacion:
          validatePrecision(
            precision_gps,
          ),

        kilometraje_final:
          finalMileage,

        duracion_segundos:
          durationSeconds,

        observacion_finalizacion:
          validateObservation(
            observacion,
          ),
      },
      {
        transaction,
      },
    );

    await programacion.update(
      {
        estado_programacion:
          ESTADOS_PROGRAMACION
            .FINALIZADA,
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
          .FINALIZACION,
      fecha_evento:
        eventDate,
      latitud:
        location.latitud,
      longitud:
        location.longitud,
      precision_gps:
        validatePrecision(
          precision_gps,
        ),
      observacion:
        validateObservation(
          observacion,
        ),
      clave_idempotencia:
        idempotencyKey,
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

module.exports = finalizarRecorridoService;