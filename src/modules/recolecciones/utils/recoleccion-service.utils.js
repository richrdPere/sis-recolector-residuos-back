// utils/recoleccion-service.utils.js

const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  Recorrido,
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  RutaPunto,
} = db;

const getOperationalContext = async ({
  id_recorrido,
  id_usuario,
  transaction,
  requireInProgress = true,
}) => {
  const recorrido =
    await Recorrido.findByPk(
      id_recorrido,
      {
        transaction,

        lock:
          transaction
            ? transaction
              .LOCK.UPDATE
            : undefined,
      },
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  if (
    requireInProgress &&
    recorrido.estado_recorrido !==
    'EN_CURSO'
  ) {
    throw new AppError(
      'Las recolecciones solo pueden registrarse durante un recorrido en curso.',
      409,
      'ROUTE_JOURNEY_NOT_IN_PROGRESS',
    );
  }

  const programacion =
    await ProgramacionRuta
      .findByPk(
        recorrido
          .id_programacion,
        {
          transaction,
        },
      );

  if (!programacion) {
    throw new AppError(
      'La programación asociada no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  if (
    requireInProgress &&
    programacion
      .estado_programacion !==
    'EN_CURSO'
  ) {
    throw new AppError(
      'La programación no se encuentra en curso.',
      409,
      'PROGRAMMING_NOT_IN_PROGRESS',
    );
  }

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
            programacion
              .id_programacion,

          id_personal:
            personal
              .id_personal,

          funcion: {
            [Op.in]: [
              'CONDUCTOR',
              'RECOLECTOR',
            ],
          },

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
      'El usuario no pertenece al equipo autorizado del recorrido.',
      403,
      'COLLECTION_USER_NOT_AUTHORIZED',
    );
  }

  return {
    recorrido,
    programacion,
    personal,
    asignacion,
  };
};

const getRoutePointOrFail = async ({
  id_ruta_punto,
  id_ruta_version,
  transaction,
}) => {
  const punto =
    await RutaPunto.findOne({
      where: {
        id_ruta_punto,

        id_ruta_version,

        estado:
          true,
      },

      transaction,
    });

  if (!punto) {
    throw new AppError(
      'El punto no pertenece a la versión de ruta programada.',
      409,
      'POINT_NOT_IN_PROGRAMMED_ROUTE',
    );
  }

  return punto;
};

const calculateDistanceMeters = (
  latitudeOne,
  longitudeOne,
  latitudeTwo,
  longitudeTwo,
) => {
  if (
    [
      latitudeOne,
      longitudeOne,
      latitudeTwo,
      longitudeTwo,
    ].some(
      (
        value,
      ) =>
        value === null ||
        value === undefined,
    )
  ) {
    return null;
  }

  const earthRadius =
    6371000;

  const toRadians = (
    degrees,
  ) =>
    (
      Number(degrees) *
      Math.PI
    ) /
    180;

  const firstLatitude =
    toRadians(
      latitudeOne,
    );

  const secondLatitude =
    toRadians(
      latitudeTwo,
    );

  const latitudeDifference =
    toRadians(
      Number(latitudeTwo) -
      Number(latitudeOne),
    );

  const longitudeDifference =
    toRadians(
      Number(longitudeTwo) -
      Number(longitudeOne),
    );

  const a =
    Math.sin(
      latitudeDifference / 2,
    ) ** 2 +
    Math.cos(
      firstLatitude,
    ) *
    Math.cos(
      secondLatitude,
    ) *
    Math.sin(
      longitudeDifference / 2,
    ) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a),
    );

  return Number(
    (
      earthRadius *
      c
    ).toFixed(2),
  );
};

module.exports = {
  getOperationalContext,
  getRoutePointOrFail,
  calculateDistanceMeters,
};