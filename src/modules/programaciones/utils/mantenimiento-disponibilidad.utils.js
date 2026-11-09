const { Op } = require('sequelize');

const {
  validateProgrammingWindow,
} = require('../validations/programacion.validation');

// ProgramacionRuta guarda fecha y horas locales.
// Se interpretan en horario de Perú: UTC-05:00.
const construirFiltroMantenimiento = (params) => {
  validateProgrammingWindow(params);

  const fecha = String(
    params.fecha_programada,
  ).trim();

  const horaInicio = String(
    params.hora_inicio_programada,
  ).trim();

  const horaFin = String(
    params.hora_fin_programada,
  ).trim();

  const inicio = new Date(
    `${fecha}T${horaInicio}-05:00`,
  );

  const fin = new Date(
    `${fecha}T${horaFin}-05:00`,
  );

  return {
    [Op.or]: [
      // Una intervención abierta sigue bloqueando
      // hasta que se registre su finalización.
      {
        estado_mantenimiento: 'EN_PROCESO',
      },

      // Hay cruce cuando:
      // inicio del mantenimiento < fin de programación
      // fin del mantenimiento > inicio de programación
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
};

module.exports = {
  construirFiltroMantenimiento,
};