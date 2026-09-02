const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/rutas-service.utils');

const {
  validateSchedule,
  validateOverlap
} = require("../../utils/ruta-horario/ruta-horario.utils");

// Modelos
const { RutaHorario } = db;

// ===============================================
// SERVICE: Actualizar ruta horario
// ===============================================
const updateRutaHorarioService = async (
  idRuta,
  idHorario,
  payload,
) => {
  const routeId =
    validateId(
      idRuta,
      'identificador de la ruta',
    );

  const scheduleId =
    validateId(
      idHorario,
      'identificador del horario',
    );

  const horario =
    await RutaHorario.findOne({
      where: {
        id_ruta_horario:
          scheduleId,

        id_ruta: routeId,
      },
    });

  if (!horario) {
    throw new AppError(
      'El horario no fue encontrado.',
      404,
      'ROUTE_SCHEDULE_NOT_FOUND',
    );
  }

  const fields = [
    'dia_semana',
    'hora_inicio',
    'hora_fin',
    'frecuencia',
    'fecha_vigencia_desde',
    'fecha_vigencia_hasta',
  ];

  const data = {};

  fields.forEach(
    (field) => {
      if (
        payload[field] !==
        undefined
      ) {
        data[field] =
          payload[field];
      }
    },
  );

  if (
    payload.observacion !==
    undefined
  ) {
    data.observacion =
      payload.observacion
        ?.trim() || null;
  }

  if (!Object.keys(data).length) {
    throw new AppError(
      'No se proporcionaron campos para actualizar.',
      400,
      'NO_UPDATE_FIELDS',
    );
  }

  const finalData = {
    dia_semana:
      data.dia_semana ||
      horario.dia_semana,

    hora_inicio:
      data.hora_inicio ||
      horario.hora_inicio,

    hora_fin:
      data.hora_fin ||
      horario.hora_fin,

    frecuencia:
      data.frecuencia ||
      horario.frecuencia,

    fecha_vigencia_desde:
      data
        .fecha_vigencia_desde ||
      horario
        .fecha_vigencia_desde,

    fecha_vigencia_hasta:
      data
        .fecha_vigencia_hasta !==
        undefined
        ? data
          .fecha_vigencia_hasta
        : horario
          .fecha_vigencia_hasta,
  };

  validateSchedule(
    finalData,
  );

  await validateOverlap(
    routeId,
    finalData,
    scheduleId,
  );

  await horario.update(data);

  return horario;
};

module.exports = updateRutaHorarioService;