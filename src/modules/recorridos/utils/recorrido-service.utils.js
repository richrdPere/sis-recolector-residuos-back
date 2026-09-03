const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const { ESTADOS_RECORRIDO_ACTIVO } = require('./recorrido.constants');

const { validateId } = require('../validations/recorrido.validation');

const {
  Recorrido,
  RecorridoEvento,
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
  Vehiculo,
} = db;

const getProgramacionOrFail = async (
  idProgramacion,
  transaction = null,
  lock = false,
) => {
  const id =
    validateId(
      idProgramacion,
      'identificador de la programación',
    );

  const programacion =
    await ProgramacionRuta.findByPk(
      id,
      {
        transaction,

        lock:
          lock && transaction
            ? transaction.LOCK.UPDATE
            : undefined,
      },
    );

  if (!programacion) {
    throw new AppError(
      'La programación no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  return programacion;
};

const getRecorridoOrFail = async (
  idRecorrido,
  transaction = null,
  lock = false,
) => {
  const id =
    validateId(
      idRecorrido,
      'identificador del recorrido',
    );

  const recorrido =
    await Recorrido.findByPk(
      id,
      {
        transaction,

        lock:
          lock && transaction
            ? transaction.LOCK.UPDATE
            : undefined,
      },
    );

  if (!recorrido) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_EXECUTION_NOT_FOUND',
    );
  }

  return recorrido;
};

const getVehiculoOrFail = async (
  idVehiculo,
  transaction = null,
  lock = false,
) => {
  const id =
    validateId(
      idVehiculo,
      'identificador del vehículo',
    );

  const vehiculo =
    await Vehiculo.findByPk(
      id,
      {
        transaction,

        lock:
          lock && transaction
            ? transaction.LOCK.UPDATE
            : undefined,
      },
    );

  if (!vehiculo) {
    throw new AppError(
      'El vehículo no fue encontrado.',
      404,
      'VEHICLE_NOT_FOUND',
    );
  }

  return vehiculo;
};

const getPersonalByUser = async (
  idUsuario,
  transaction = null,
) => {
  const userId =
    validateId(
      idUsuario,
      'identificador del usuario',
    );

  const personal =
    await PersonalOperativo.findOne({
      where: {
        id_usuario:
          userId,

        estado: true,

        estado_laboral:
          'ACTIVO',
      },

      transaction,
    });

  if (!personal) {
    throw new AppError(
      'El usuario no pertenece al personal operativo activo.',
      403,
      'OPERATIONAL_PERSONNEL_NOT_FOUND',
    );
  }

  return personal;
};

const assertAssignedDriver = async ({
  id_programacion,
  id_usuario,
  transaction = null,
}) => {
  const personal =
    await getPersonalByUser(
      id_usuario,
      transaction,
    );

  const assignment =
    await ProgramacionPersonal.findOne({
      where: {
        id_programacion,

        id_personal:
          personal.id_personal,

        funcion:
          'CONDUCTOR',

        estado_asignacion:
          'ACEPTADO',
      },

      transaction,
    });

  if (!assignment) {
    throw new AppError(
      'El usuario no es el conductor aceptado de esta programación.',
      403,
      'USER_NOT_ASSIGNED_DRIVER',
    );
  }

  return {
    personal,
    assignment,
  };
};

const createRecorridoEvent = async ({
  id_recorrido,
  id_usuario,
  tipo_evento,
  fecha_evento,
  latitud = null,
  longitud = null,
  precision_gps = null,
  observacion = null,
  clave_idempotencia = null,
  datos = null,
  origen = 'APP',
  ip = null,
  user_agent = null,
  transaction = null,
}) => {
  return RecorridoEvento.create(
    {
      id_recorrido,
      id_usuario,
      tipo_evento,
      fecha_evento,
      fecha_recepcion:
        new Date(),
      latitud,
      longitud,
      precision_gps,
      observacion,
      clave_idempotencia,
      datos,
      origen,
      ip,
      user_agent,
    },
    {
      transaction,
    },
  );
};

const findIdempotentEvent = async ({
  clave_idempotencia,
  tipo_evento,
  id_usuario,
}) => {
  if (!clave_idempotencia) {
    return null;
  }

  return RecorridoEvento.findOne({
    where: {
      clave_idempotencia,
      tipo_evento,
      id_usuario,
    },
  });
};

const getRecorridoDetail = async (
  idRecorrido,
) => {
  return Recorrido.findByPk(
    idRecorrido,
    {
      include: [
        {
          association:
            'programacion',
        },
        {
          association:
            'usuario_inicio',

          attributes: [
            'id_usuario',
            'username',
            'email_acceso',
          ],
        },
        {
          association:
            'usuario_finalizacion',

          attributes: [
            'id_usuario',
            'username',
            'email_acceso',
          ],
          required: false,
        },
        {
          association:
            'eventos',

          separate: true,

          order: [
            [
              'fecha_evento',
              'ASC',
            ],
          ],

          include: [
            {
              association:
                'usuario',

              attributes: [
                'id_usuario',
                'username',
              ],

              required: false,
            },
          ],
        },
      ],
    },
  );
};

const getActiveProgrammingIdsForUser = async (
  idUsuario,
) => {
  const personal =
    await getPersonalByUser(
      idUsuario,
    );

  const assignments =
    await ProgramacionPersonal.findAll({
      where: {
        id_personal:
          personal.id_personal,

        estado_asignacion:
          'ACEPTADO',
      },

      attributes: [
        'id_programacion',
      ],
    });

  return assignments.map(
    (item) =>
      item.id_programacion,
  );
};

const getActiveRecorridoForUser = async (
  idUsuario,
) => {
  const programmingIds =
    await getActiveProgrammingIdsForUser(
      idUsuario,
    );

  if (!programmingIds.length) {
    return null;
  }

  return Recorrido.findOne({
    where: {
      id_programacion: {
        [Op.in]:
          programmingIds,
      },

      estado_recorrido: {
        [Op.in]:
          ESTADOS_RECORRIDO_ACTIVO,
      },

      estado: true,
    },

    order: [
      [
        'fecha_hora_inicio',
        'DESC',
      ],
    ],
  });
};

module.exports = {
  getProgramacionOrFail,
  getRecorridoOrFail,
  getVehiculoOrFail,
  getPersonalByUser,
  assertAssignedDriver,
  createRecorridoEvent,
  findIdempotentEvent,
  getRecorridoDetail,
  getActiveProgrammingIdsForUser,
  getActiveRecorridoForUser,
};