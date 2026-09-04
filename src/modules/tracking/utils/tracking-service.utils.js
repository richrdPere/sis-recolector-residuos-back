const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Modelos
const {
  Recorrido,
  ProgramacionPersonal,
  PersonalOperativo,
  RecorridoUltimaUbicacion,
} = db;

// ===============================================
// Obtener recorrido
// ===============================================

const getRecorridoOrFail = async (idRecorrido, {
  transaction = null,
  lock = false,
} = {},
) => {
  const options = {
    transaction,
  };

  if (
    lock &&
    transaction
  ) {
    options.lock =
      transaction.LOCK.UPDATE;
  }

  const recorrido =
    await Recorrido.findByPk(
      idRecorrido,
      options,
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  return recorrido;
};

// ===============================================
// Validar usuario transmisor
// ===============================================

const assertTrackingTransmitter = async ({
  recorrido,
  id_usuario,
  transaction = null,
}) => {
  const personal =
    await PersonalOperativo
      .findOne({
        where: {
          id_usuario,
        },

        transaction,
      });

  if (!personal) {
    throw new AppError(
      'El usuario no está asociado con personal operativo.',
      403,
      'OPERATIONAL_PERSONNEL_REQUIRED',
    );
  }

  const asignacion =
    await ProgramacionPersonal
      .findOne({
        where: {
          id_programacion:
            recorrido
              .id_programacion,

          id_personal:
            personal
              .id_personal,

          funcion:
            'CONDUCTOR',

          es_principal:
            true,

          estado_asignacion: {
            [Op.in]: [
              'ACEPTADO',
              'EN_SERVICIO',
            ],
          },
        },

        transaction,
      });

  if (!asignacion) {
    throw new AppError(
      'Solo el conductor principal asignado puede transmitir ubicaciones.',
      403,
      'TRACKING_TRANSMITTER_NOT_AUTHORIZED',
    );
  }

  return {
    personal,
    asignacion,
  };
};

// ===============================================
// Validar recorrido activo
// ===============================================

const assertRecorridoAllowsTracking = (recorrido,) => {
  if (
    recorrido
      .estado_recorrido !==
    'EN_CURSO'
  ) {
    throw new AppError(
      'El recorrido no se encuentra en curso.',
      409,
      'ROUTE_JOURNEY_NOT_IN_PROGRESS',
    );
  }

  if (
    recorrido.estado ===
    false
  ) {
    throw new AppError(
      'El recorrido se encuentra inactivo.',
      409,
      'ROUTE_JOURNEY_INACTIVE',
    );
  }
};

// ===============================================
// Actualizar última ubicación
// ===============================================

const updateLastLocation = async ({
  posicion,
  transaction,
}) => {
  /*
  | El recorrido se bloquea previamente en el service.
  | Eso serializa las ubicaciones del mismo recorrido.
  */

  const currentLastLocation =
    await RecorridoUltimaUbicacion
      .findOne({
        where: {
          id_recorrido:
            posicion
              .id_recorrido,
        },

        transaction,

        lock:
          transaction.LOCK
            .UPDATE,
      });

  /*
  | Una posición inválida queda en el historial,
  | pero no reemplaza la última ubicación válida.
  */

  if (
    posicion.es_valida ===
    false
  ) {
    return {
      updated:
        false,

      lastLocation:
        currentLastLocation,
    };
  }

  if (
    currentLastLocation &&
    new Date(
      posicion
        .fecha_dispositivo,
    ).getTime() <=
    new Date(
      currentLastLocation
        .fecha_dispositivo,
    ).getTime()
  ) {
    return {
      updated:
        false,

      lastLocation:
        currentLastLocation,
    };
  }

  const data = {
    id_recorrido:
      posicion.id_recorrido,

    id_posicion:
      posicion.id_posicion,

    id_usuario:
      posicion.id_usuario,

    latitud:
      posicion.latitud,

    longitud:
      posicion.longitud,

    precision_gps:
      posicion.precision_gps,

    altitud:
      posicion.altitud,

    velocidad_mps:
      posicion.velocidad_mps,

    rumbo:
      posicion.rumbo,

    nivel_bateria:
      posicion.nivel_bateria,

    es_ubicacion_simulada:
      posicion
        .es_ubicacion_simulada,

    fecha_dispositivo:
      posicion
        .fecha_dispositivo,

    fecha_recepcion:
      posicion
        .fecha_recepcion,
  };

  if (
    currentLastLocation
  ) {
    await currentLastLocation
      .update(
        data,
        {
          transaction,
        },
      );

    return {
      updated:
        true,

      lastLocation:
        currentLastLocation,
    };
  }

  const lastLocation =
    await RecorridoUltimaUbicacion
      .create(
        data,
        {
          transaction,
        },
      );

  return {
    updated:
      true,

    lastLocation,
  };
};

module.exports = {
  getRecorridoOrFail,
  assertTrackingTransmitter,
  assertRecorridoAllowsTracking,
  updateLastLocation,
};