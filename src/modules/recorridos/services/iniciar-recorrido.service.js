const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Constants
const {
  ESTADOS_RECORRIDO,
  ESTADOS_PROGRAMACION,
  ESTADOS_VEHICULO,
  TIPOS_EVENTO_RECORRIDO,
} = require(
  '../utils/recorrido.constants',
);

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
} = require(
  '../validations/recorrido.validation',
);

// Uitls
const {
  getProgramacionOrFail,
  getVehiculoOrFail,
  assertAssignedDriver,
  createRecorridoEvent,
  findIdempotentEvent,
  getRecorridoDetail,
  getActiveRecorridoForUser,
} = require(
  '../utils/recorrido-service.utils',
);

// Modelos
const {
  Recorrido,
  sequelize,
} = db;

// =======================================================
// Service: Iniciar recorrido
// =======================================================
const iniciarRecorridoService = async ({
  id_programacion,
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
  const programmingId =
    validateId(
      id_programacion,
      'identificador de la programación',
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

  const accuracy =
    validatePrecision(
      precision_gps,
    );

  const initialMileage =
    validateMileage(
      kilometraje,
      'kilometraje inicial',
    );

  const observation =
    validateObservation(
      observacion,
    );

  const idempotencyKey =
    validateIdempotencyKey(
      clave_idempotencia,
    );

  const eventOrigin =
    normalizeOrigin(
      origen,
    );

  const previousEvent =
    await findIdempotentEvent({
      clave_idempotencia:
        idempotencyKey,

      tipo_evento:
        TIPOS_EVENTO_RECORRIDO.INICIO,

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
    const programacion =
      await getProgramacionOrFail(
        programmingId,
        transaction,
        true,
      );

    if (
      programacion
        .estado_programacion !==
      ESTADOS_PROGRAMACION.ACEPTADA
    ) {
      throw new AppError(
        'La programación debe estar aceptada para iniciar el recorrido.',
        409,
        'PROGRAMMING_CANNOT_START',
      );
    }

    await assertAssignedDriver({
      id_programacion:
        programmingId,

      id_usuario:
        userId,

      transaction,
    });

    const activeRecorrido =
      await getActiveRecorridoForUser(
        userId,
      );

    if (activeRecorrido) {
      throw new AppError(
        'El usuario ya tiene un recorrido activo.',
        409,
        'USER_ALREADY_HAS_ACTIVE_ROUTE',
      );
    }

    const existingRecorrido =
      await Recorrido.findOne({
        where: {
          id_programacion:
            programmingId,
        },

        transaction,
        lock:
          transaction.LOCK.UPDATE,
      });

    if (existingRecorrido) {
      throw new AppError(
        'La programación ya tiene un recorrido registrado.',
        409,
        'PROGRAMMING_ALREADY_STARTED',
      );
    }

    const vehiculo =
      await getVehiculoOrFail(
        programacion.id_vehiculo,
        transaction,
        true,
      );

    if (
      [
        ESTADOS_VEHICULO
          .EN_MANTENIMIENTO,

        ESTADOS_VEHICULO
          .FUERA_DE_SERVICIO,
      ].includes(
        vehiculo.estado_operativo,
      )
    ) {
      throw new AppError(
        'El vehículo no está disponible operativamente.',
        409,
        'VEHICLE_NOT_OPERATIONAL',
      );
    }

    const recorrido =
      await Recorrido.create(
        {
          id_programacion:
            programmingId,

          id_usuario_inicio:
            userId,

          estado_recorrido:
            ESTADOS_RECORRIDO
              .EN_CURSO,

          fecha_hora_inicio:
            eventDate,

          latitud_inicio:
            location.latitud,

          longitud_inicio:
            location.longitud,

          precision_inicio:
            accuracy,

          kilometraje_inicio:
            initialMileage,

          observacion_inicio:
            observation,

          estado: true,
        },
        {
          transaction,
        },
      );

    await createRecorridoEvent({
      id_recorrido:
        recorrido.id_recorrido,

      id_usuario:
        userId,

      tipo_evento:
        TIPOS_EVENTO_RECORRIDO
          .INICIO,

      fecha_evento:
        eventDate,

      latitud:
        location.latitud,

      longitud:
        location.longitud,

      precision_gps:
        accuracy,

      observacion:
        observation,

      clave_idempotencia:
        idempotencyKey,

      origen:
        eventOrigin,

      ip,
      user_agent,
      transaction,
    });

    await programacion.update(
      {
        estado_programacion:
          ESTADOS_PROGRAMACION
            .EN_CURSO,
      },
      {
        transaction,
      },
    );

    await vehiculo.update(
      {
        estado_operativo:
          ESTADOS_VEHICULO
            .EN_RUTA,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return getRecorridoDetail(
      recorrido.id_recorrido,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = iniciarRecorridoService;