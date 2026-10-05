const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Utils
const {
  ESTADOS,
  ESTADOS_PROGRAMACION,
  CAMPOS_CREACION,
  CAMPOS_ACTUALIZACION,
  CAMPOS_FINALIZACION,
  CAMPOS_ORDENAMIENTO,
  error,
  validarId,
  validarBody,
  texto,
  fecha,
  decimal,
  validarIntervalo,
  enteroQuery,
  prepararDatos
} = require("../utils/mantenimientos.utils");
// Modelos
const {
  sequelize,
  Usuario,
  Vehiculo,
  ProgramacionRuta,
  Recorrido,
  VehiculoMantenimiento,
  VehiculoMantenimientoHistorial,
} = db;

// *********************************************************
// INCLUDES DE DETALLE
// *********************************************************

const usuarioInclude = (as) => ({
  model: Usuario,
  as,

  // Permite mostrar responsables eliminados lógicamente.
  paranoid: false,
  required: false,

  attributes: [
    'id_usuario',
    'username',
    'email_acceso',
  ],
});

const includesDetalle = () => [
  {
    model: Vehiculo,
    as: 'vehiculo',
    paranoid: false,

    attributes: [
      'id_vehiculo',
      'codigo',
      'placa',
      'marca',
      'modelo',
      'kilometraje',
      'estado_operativo',
      'estado',
    ],
  },

  usuarioInclude('creador'),
  usuarioInclude('usuario_inicio'),
  usuarioInclude('usuario_finalizacion'),
  usuarioInclude('usuario_cancelacion'),

  {
    model: VehiculoMantenimientoHistorial,
    as: 'historial',
    separate: true,

    include: [
      usuarioInclude('actor'),
    ],

    order: [
      ['created_at', 'ASC'],
      ['id_historial', 'ASC'],
    ],
  },
];

const obtenerDetalle = async (
  idMantenimiento,
  transaction = undefined,
) => {
  const mantenimiento =
    await VehiculoMantenimiento.findByPk(
      idMantenimiento,
      {
        include: includesDetalle(),
        transaction,
      },
    );

  if (!mantenimiento) {
    error('El mantenimiento no existe.', 404);
  }

  return mantenimiento.toJSON();
};

// *********************************************************
// USUARIO ACTOR
// *********************************************************

const validarActor = async (usuarioId, transaction) => {
  const id = validarId(usuarioId, 'ID del usuario');

  const usuario = await Usuario.findByPk(id, {
    attributes: ['id_usuario', 'estado'],
    transaction,
  });

  if (!usuario || !usuario.estado) {
    error('El usuario no está habilitado.', 403);
  }

  return id;
};

// *********************************************************
// BLOQUEO DEL VEHÍCULO
// *********************************************************

const bloquearVehiculo = async (
  idVehiculo,
  transaction,
) => {
  const vehiculo = await Vehiculo.findByPk(
    idVehiculo,
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    },
  );

  if (!vehiculo) {
    error('El vehículo no existe.', 404);
  }

  return vehiculo;
};

// Todas las operaciones toman primero el bloqueo del vehículo
// y después el de la orden.
//
// id_vehiculo no se modifica mediante update.
const bloquearOrden = async (
  idMantenimiento,
  transaction,
) => {
  const referencia =
    await VehiculoMantenimiento.findByPk(
      idMantenimiento,
      {
        attributes: [
          'id_mantenimiento',
          'id_vehiculo',
        ],
        transaction,
      },
    );

  if (!referencia) {
    error('El mantenimiento no existe.', 404);
  }

  const vehiculo = await bloquearVehiculo(
    referencia.id_vehiculo,
    transaction,
  );

  const mantenimiento =
    await VehiculoMantenimiento.findByPk(
      idMantenimiento,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

  if (!mantenimiento) {
    error('El mantenimiento no existe.', 404);
  }

  return { mantenimiento, vehiculo };
};

// *********************************************************
// HISTORIAL
// *********************************************************

const registrarHistorial = async ({
  mantenimiento,
  usuarioId,
  tipoEvento,
  anterior,
  observacion = null,
  transaction,
}) => {
  await VehiculoMantenimientoHistorial.create(
    {
      id_mantenimiento:
        mantenimiento.id_mantenimiento,

      id_usuario: usuarioId,
      tipo_evento: tipoEvento,

      estado_anterior:
        anterior?.estado_mantenimiento ?? null,

      estado_nuevo:
        mantenimiento.estado_mantenimiento,

      datos_anteriores: anterior,
      datos_nuevos: mantenimiento.toJSON(),
      observacion,
    },
    { transaction },
  );
};

// *********************************************************
// FECHAS DE PROGRAMACIONES
// *********************************************************

// ProgramacionRuta guarda fecha y horas locales.
// Para Calca se interpretan en America/Lima, UTC-05:00.
const fechaLocalLima = (date) =>
  new Date(date.getTime() - 5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

const intervaloProgramacion = (programacion) => {
  const dia = programacion.fecha_programada;

  const inicio = new Date(
    `${dia}T${programacion.hora_inicio_programada}-05:00`,
  );

  const fin = new Date(
    `${dia}T${programacion.hora_fin_programada}-05:00`,
  );

  if (
    !Number.isFinite(inicio.getTime()) ||
    !Number.isFinite(fin.getTime())
  ) {
    error(
      `La programación ${programacion.id_programacion} tiene fechas inválidas.`,
      409,
    );
  }

  // Admite turnos que cruzan medianoche.
  if (fin <= inicio) {
    fin.setUTCDate(fin.getUTCDate() + 1);
  }

  return { inicio, fin };
};

// *********************************************************
// VALIDAR DISPONIBILIDAD
// *********************************************************

const validarDisponibilidad = async ({
  idVehiculo,
  inicio,
  fin,
  excluirId = null,
  transaction,
}) => {
  validarIntervalo(inicio, fin);

  const whereMantenimiento = {
    id_vehiculo: idVehiculo,

    [Op.or]: [
      // Una intervención abierta sigue bloqueando,
      // aunque haya vencido su fecha prevista.
      { estado_mantenimiento: 'EN_PROCESO' },

      {
        estado_mantenimiento: 'PROGRAMADO',

        fecha_inicio_programada: {
          [Op.lt]: fin,
        },

        fecha_fin_programada: {
          [Op.gt]: inicio,
        },
      },
    ],
  };

  if (excluirId) {
    whereMantenimiento.id_mantenimiento = {
      [Op.ne]: excluirId,
    };
  }

  const conflicto =
    await VehiculoMantenimiento.findOne({
      where: whereMantenimiento,
      attributes: ['id_mantenimiento'],
      transaction,
    });

  if (conflicto) {
    error(
      `El vehículo tiene un mantenimiento incompatible: ${conflicto.id_mantenimiento}.`,
      409,
    );
  }

  // Incluye el día anterior para detectar jornadas
  // que comienzan antes de medianoche.
  const diaAnterior = new Date(inicio);
  diaAnterior.setUTCDate(
    diaAnterior.getUTCDate() - 1,
  );

  const programaciones =
    await ProgramacionRuta.findAll({
      where: {
        id_vehiculo: idVehiculo,

        estado_programacion: {
          [Op.in]: ESTADOS_PROGRAMACION,
        },

        fecha_programada: {
          [Op.between]: [
            fechaLocalLima(diaAnterior),
            fechaLocalLima(fin),
          ],
        },
      },

      attributes: [
        'id_programacion',
        'fecha_programada',
        'hora_inicio_programada',
        'hora_fin_programada',
      ],

      transaction,
    });

  const idsConflicto = programaciones
    .filter((programacion) => {
      const intervalo =
        intervaloProgramacion(programacion);

      return (
        intervalo.inicio < fin &&
        intervalo.fin > inicio
      );
    })
    .map((item) => item.id_programacion);

  if (idsConflicto.length) {
    error(
      `El mantenimiento se superpone con las programaciones: ${idsConflicto.join(', ')}.`,
      409,
    );
  }
};

const validarSinOperacionActiva = async (
  idVehiculo,
  transaction,
) => {
  const programacionActiva =
    await ProgramacionRuta.findOne({
      where: {
        id_vehiculo: idVehiculo,

        estado_programacion: {
          [Op.in]: ['EN_CURSO', 'PAUSADA'],
        },
      },

      attributes: ['id_programacion'],
      transaction,
    });

  if (programacionActiva) {
    error(
      'El vehículo tiene una programación en ejecución.',
      409,
    );
  }

  const recorridoActivo = await Recorrido.findOne({
    where: {
      estado_recorrido: {
        [Op.in]: ['EN_CURSO', 'PAUSADO'],
      },
    },

    include: [
      {
        model: ProgramacionRuta,
        as: 'programacion',
        required: true,

        // También detecta inconsistencias si la programación
        // fue eliminada lógicamente.
        paranoid: false,

        where: {
          id_vehiculo: idVehiculo,
        },

        attributes: ['id_programacion'],
      },
    ],

    transaction,
  });

  if (recorridoActivo) {
    error(
      'El vehículo tiene un recorrido activo o pausado.',
      409,
    );
  }
};


module.exports = {
  bloquearVehiculo,
  obtenerDetalle,
  validarActor,
  bloquearOrden,
  registrarHistorial,
  validarDisponibilidad,
  validarSinOperacionActiva,
}