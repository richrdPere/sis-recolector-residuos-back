const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Utils
const { createRecorridoEvent } = require('./recorrido-service.utils');

// Auditoria
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

const cancelarRecorridosPorProgramacion = async ({
  programacion,
  idUsuario,
  motivo,
  fecha = new Date(),
  ip = null,
  userAgent = null,
  transaction,
}) => {
  if (!transaction) {
    throw new AppError(
      'La cancelación requiere una transacción.',
      500,
    );
  }

  // Bloquear únicamente los recorridos que todavía siguen abiertos.
  const recorridos = await db.Recorrido.findAll({
    where: {
      id_programacion: programacion.id_programacion,

      estado_recorrido: {
        [Op.in]: ['EN_CURSO', 'PAUSADO'],
      },
    },

    order: [['id_recorrido', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!recorridos.length) return [];

  const contexto = {
    motivo: motivo.slice(0, 1000),
  };

  const ids = [];

  for (const recorrido of recorridos) {
    const auditar = prepararAuditoria(
      'RECORRIDO',
      'CANCELAR_POR_PROGRAMACION',
      recorrido,
    );

    await recorrido.update(
      {
        estado_recorrido: 'CANCELADO',
        id_usuario_finalizacion: idUsuario,
        fecha_hora_finalizacion: fecha,
        motivo_cancelacion: motivo,
      },
      { transaction },
    );

    await createRecorridoEvent({
      id_recorrido: recorrido.id_recorrido,
      id_usuario: idUsuario,
      tipo_evento: 'CANCELACION',
      fecha_evento: fecha,
      observacion: motivo,

      clave_idempotencia:
        `CANCELACION_PROGRAMACION:${programacion.id_programacion}` +
        `:RECORRIDO:${recorrido.id_recorrido}`,

      origen: 'WEB',
      ip,
      user_agent: userAgent,

      datos: {
        causa: 'CANCELACION_PROGRAMACION',
        id_programacion: programacion.id_programacion,
        fecha_cancelacion_programacion:
          programacion.fecha_cancelacion,
      },

      transaction,
    });

    await auditar(
      recorrido,
      transaction,
      contexto,
    );

    ids.push(recorrido.id_recorrido);
  }

  // Descartar avisos pendientes de los recorridos cancelados.
  await db.Notificacion.update(
    {
      estado_notificacion: 'CANCELADA',
      fecha_procesamiento: fecha,
    },
    {
      where: {
        tipo_entidad: 'RECORRIDO',

        id_entidad: {
          [Op.in]: ids,
        },

        estado_notificacion: {
          [Op.in]: [
            'PENDIENTE',
            'PROCESANDO',
            'PARCIAL',
            'FALLIDA',
          ],
        },
      },

      transaction,
      hooks: false,
    },
  );

  const vehiculo = await db.Vehiculo.findByPk(
    programacion.id_vehiculo,
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    },
  );

  if (!vehiculo) {
    throw new AppError(
      'No se encontró el vehículo de la programación.',
      409,
      'VEHICLE_NOT_FOUND',
    );
  }

  // Conservar estados como mantenimiento o fuera de servicio.
  if (vehiculo.estado_operativo === 'EN_RUTA') {
    // El mismo vehículo podría estar asociado a otro recorrido abierto.
    const otroActivo = await db.Recorrido.findOne({
      where: {
        estado: true,

        estado_recorrido: {
          [Op.in]: ['EN_CURSO', 'PAUSADO'],
        },
      },

      include: [
        {
          association: 'programacion',
          required: true,
          attributes: [],

          where: {
            id_vehiculo: programacion.id_vehiculo,
          },
        },
      ],

      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!otroActivo) {
      const auditarVehiculo = prepararAuditoria(
        'VEHICULO',
        'LIBERAR_POR_CANCELACION_PROGRAMACION',
        vehiculo,
      );

      await vehiculo.update(
        {
          estado_operativo: 'DISPONIBLE',
        },
        { transaction },
      );

      await auditarVehiculo(
        vehiculo,
        transaction,
        contexto,
      );
    }
  }

  return ids;
};

module.exports = cancelarRecorridosPorProgramacion;