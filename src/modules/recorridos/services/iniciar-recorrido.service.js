const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../jobs/notification-worker');

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
  getProgramacionOrFail,
  getVehiculoOrFail,
  assertAssignedDriver,
  createRecorridoEvent,
  findIdempotentEvent,
  getRecorridoDetail,
  getActiveRecorridoForUser,
} = require('../utils/recorrido-service.utils');

// Modelos
const {
  Recorrido,
  sequelize,
} = db;

// Services
const crearAvisoCiudadano = require('../../notificaciones/services/ciudadanos/crear-aviso-ciudadano.service');

// ==========================================================
// SERVICE: INICIAR RECORRIDO
// ==========================================================

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
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  const programmingId = validateId(
    id_programacion,
    'identificador de la programación',
  );

  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const location = validateCoordinates({
    latitud,
    longitud,
    required: true,
  });

  const eventDate =
    validateEventDate(fecha_evento);

  const accuracy =
    validatePrecision(precision_gps);

  const initialMileage = validateMileage(
    kilometraje,
    'kilometraje inicial',
  );

  const observation =
    validateObservation(observacion);

  const idempotencyKey =
    validateIdempotencyKey(
      clave_idempotencia,
    );

  const eventOrigin =
    normalizeOrigin(origen);

  // --------------------------------------------------------
  // 2. Comprobar idempotencia
  // --------------------------------------------------------

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
    /*
     * No volver a crear avisos si el evento
     * ya fue registrado.
     */
    return getRecorridoDetail(
      previousEvent.id_recorrido,
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 3. Obtener y bloquear programación
    // ------------------------------------------------------

    const programacion =
      await getProgramacionOrFail(
        programmingId,
        transaction,
        true,
      );

    if (
      programacion.estado_programacion !==
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

    // ------------------------------------------------------
    // 4. Verificar recorridos existentes
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // 5. Obtener y validar vehículo
    // ------------------------------------------------------

    const vehiculo =
      await getVehiculoOrFail(
        programacion.id_vehiculo,
        transaction,
        true,
      );

    if (
      [
        ESTADOS_VEHICULO.EN_MANTENIMIENTO,
        ESTADOS_VEHICULO.FUERA_DE_SERVICIO,
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

    // ------------------------------------------------------
    // 6. Crear recorrido
    // ------------------------------------------------------

    const recorrido =
      await Recorrido.create(
        {
          id_programacion:
            programmingId,

          id_usuario_inicio:
            userId,

          estado_recorrido:
            ESTADOS_RECORRIDO.EN_CURSO,

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

    // ------------------------------------------------------
    // 7. Registrar evento de inicio
    // ------------------------------------------------------

    await createRecorridoEvent({
      id_recorrido:
        recorrido.id_recorrido,

      id_usuario:
        userId,

      tipo_evento:
        TIPOS_EVENTO_RECORRIDO.INICIO,

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

    // ------------------------------------------------------
    // 8. Actualizar programación y vehículo
    // ------------------------------------------------------

    await programacion.update(
      {
        estado_programacion:
          ESTADOS_PROGRAMACION.EN_CURSO,
      },
      {
        transaction,
      },
    );

    await vehiculo.update(
      {
        estado_operativo:
          ESTADOS_VEHICULO.EN_RUTA,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 9. Aviso operativo al creador de la programación
    // ------------------------------------------------------

    const creatorId =
      programacion.id_usuario_creacion;

    if (
      creatorId != null &&
      String(creatorId) !== String(userId)
    ) {
      await enqueueNotification({
        notificacion: {
          tipo_notificacion:
            'RECORRIDO_INICIADO',

          titulo:
            'Recorrido iniciado',

          mensaje:
            `El conductor inició el recorrido ` +
            `de la programación del ` +
            `${programacion.fecha_programada}.`,

          prioridad:
            'NORMAL',

          enviar_interna: true,
          enviar_push: true,

          tipo_entidad:
            'RECORRIDO',

          id_entidad:
            recorrido.id_recorrido,

          datos: {
            id_recorrido:
              recorrido.id_recorrido,

            id_programacion:
              programmingId,

            id_ruta:
              programacion.id_ruta,

            id_vehiculo:
              programacion.id_vehiculo,

            id_usuario_inicio:
              userId,

            estado_recorrido:
              ESTADOS_RECORRIDO.EN_CURSO,

            fecha_hora_inicio:
              eventDate,
          },

          clave_evento:
            'INICIO_RECORRIDO:OPERATIVO:' +
            recorrido.id_recorrido,

          origen:
            'SISTEMA',
        },

        destino: {
          tipo_destino:
            'USUARIOS',

          destinatarios: [
            String(creatorId),
          ],
        },

        id_usuario_creacion:
          userId,

        transaction,
      });
    }

    // ------------------------------------------------------
    // 10. Aviso ciudadano por inicio de ruta
    // ------------------------------------------------------

    await enqueueNotification({
      notificacion: {
        tipo_notificacion:
          'INICIO_RUTA',

        titulo:
          'La recolección ha comenzado',

        mensaje:
          'El vehículo recolector inició el recorrido ' +
          'de tu ruta. Consulta el mapa para conocer ' +
          'el avance del servicio.',

        prioridad:
          'NORMAL',

        enviar_interna: true,
        enviar_push: true,

        tipo_entidad:
          'RECORRIDO',

        id_entidad:
          recorrido.id_recorrido,

        /*
         * No incluir coordenadas exactas ni
         * observaciones operativas en el aviso ciudadano.
         */
        datos: {
          id_recorrido:
            recorrido.id_recorrido,

          id_programacion:
            programmingId,

          id_ruta:
            programacion.id_ruta,

          fecha_hora_inicio:
            eventDate,
        },

        clave_evento:
          'INICIO_RECORRIDO:CIUDADANOS:' +
          recorrido.id_recorrido,

        origen:
          'SISTEMA',
      },

      destino: {
        tipo_destino:
          'CIUDADANOS',

        evento:
          'INICIO_RUTA',

        id_ruta:
          programacion.id_ruta,
      },

      id_usuario_creacion:
        userId,

      transaction,
    });


    await crearAvisoCiudadano({
      evento: 'INICIO_RUTA',
      idRuta: programacion.id_ruta,
      tipoEntidad: 'RECORRIDO',
      idEntidad: recorrido.id_recorrido,
      claveEvento: `INICIO_RECORRIDO:CIUDADANOS:${recorrido.id_recorrido}`,
      titulo: 'La recolección ha comenzado',
      mensaje:
        'El vehículo recolector inició el recorrido de tu ruta. ' +
        'Consulta el mapa para conocer el avance del servicio.',
      datos: {
        id_recorrido: recorrido.id_recorrido,
        id_programacion: programmingId,
        fecha_hora_inicio: eventDate,
      },
      fechaEvento: eventDate,
      idUsuarioCreacion: userId,
      transaction,
    });

    // ------------------------------------------------------
    // 11. Confirmar recorrido y avisos
    // ------------------------------------------------------

    await transaction.commit();

    /*
     * El worker despachará los avisos confirmados.
     * No emitir otra notificación desde el controller.
     */
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

