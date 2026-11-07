const { Op } = require('sequelize');
const db = require('../database/models');

const { RecorridoEvento } = db;

const AppError = require('./app-error');

module.exports = async (
  recorrido,
  fechaDispositivo,
  transaction,
) => {
  const fecha = new Date(fechaDispositivo);
  const inicio = new Date(recorrido.fecha_hora_inicio);

  const fin =
    recorrido.fecha_hora_finalizacion &&
    new Date(recorrido.fecha_hora_finalizacion);

  if (
    !['EN_CURSO', 'PAUSADO', 'FINALIZADO'].includes(
      recorrido.estado_recorrido,
    ) ||
    !Number.isFinite(fecha.getTime()) ||
    fecha < inicio ||
    fecha.getTime() > Date.now() + 300000 ||
    (fin && fecha > fin) ||
    (
      recorrido.estado_recorrido === 'FINALIZADO' &&
      !fin
    )
  ) {
    throw new AppError(
      'La captura no corresponde al período autorizado del recorrido.',
      409,
      'CAPTURE_OUTSIDE_ROUTE',
    );
  }

  const evento = await RecorridoEvento.findOne({
    where: {
      id_recorrido: recorrido.id_recorrido,

      fecha_evento: {
        [Op.lte]: fecha,
      },

      tipo_evento: {
        [Op.in]: [
          'INICIO',
          'PAUSA',
          'REANUDACION',
          'FINALIZACION',
          'CANCELACION',
        ],
      },
    },

    order: [
      ['fecha_evento', 'DESC'],
      ['id_recorrido_evento', 'DESC'],
    ],

    transaction,
  });

  if (
    evento &&
    !['INICIO', 'REANUDACION', 'FINALIZACION'].includes(
      evento.tipo_evento,
    )
  ) {
    throw new AppError(
      'La captura corresponde a un período sin operación.',
      409,
      'CAPTURE_DURING_PAUSE',
    );
  }
};