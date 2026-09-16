const db = require('../../../../database/models');

// Validations
const { validateMonitorFilters } = require('../../validations/monitoreo.validation');

// Utils
const {
  buildProgrammingWhere,
  getProgrammingIncludes,
  mapRouteMonitorItem,
  buildOperationalAlerts,
  calculatePercentage,
} = require('../../utils/monitoreo-service.utils');

// Modelos
const { ProgramacionRuta } = db;

// ==============================================================
// SERVICE: Obtener operacion para el monitor
// ==============================================================
const getOperationalMonitorService = async (filters = {}) => {
  const normalizedFilters = validateMonitorFilters(filters);

  const where =
    buildProgrammingWhere(normalizedFilters);

  const include = getProgrammingIncludes({
    includeRoute: true,
    includeRoutePoints: true,
    includeVehicle: true,
    includeStaff: false,
    includeJourney: true,
  });

  if (normalizedFilters.id_zona) {
    where['$ruta.id_zona$'] =
      normalizedFilters.id_zona;
  }

  const programaciones =
    await ProgramacionRuta.findAll({
      where,
      include,
      distinct: true,
      subQuery: false,
      order: [
        ['hora_inicio_programada', 'ASC'],
        ['id_programacion', 'ASC'],
      ],
    });

  let items = programaciones.map(
    (programacion) =>
      mapRouteMonitorItem(programacion),
  );

  if (normalizedFilters.estado_recorrido) {
    items = items.filter(
      (item) =>
        item.recorrido?.estado_recorrido ===
        normalizedFilters.estado_recorrido,
    );
  }

  const alerts = buildOperationalAlerts(items);

  if (normalizedFilters.solo_alertas === true) {
    const programmingIds = new Set(
      alerts.map((alert) => alert.id_programacion),
    );

    items = items.filter((item) =>
      programmingIds.has(item.id_programacion),
    );
  }

  const countProgrammingState = (state) =>
    items.filter(
      (item) => item.estado_programacion === state,
    ).length;

  const countRouteState = (state) =>
    items.filter(
      (item) =>
        item.recorrido?.estado_recorrido === state,
    ).length;

  const finalized =
    countProgrammingState('FINALIZADA');

  const executable = items.filter(
    (item) =>
      item.estado_programacion !== 'CANCELADA',
  ).length;

  return {
    fecha_consulta: normalizedFilters.fecha,
    generado_en: new Date(),
    filtros: normalizedFilters,

    resumen: {
      total_programaciones: items.length,
      programadas:
        countProgrammingState('PROGRAMADA'),
      asignadas:
        countProgrammingState('ASIGNADA'),
      aceptadas:
        countProgrammingState('ACEPTADA'),
      en_curso:
        countRouteState('EN_CURSO'),
      pausadas:
        countRouteState('PAUSADO'),
      finalizadas: finalized,
      canceladas:
        countProgrammingState('CANCELADA'),
      con_alertas:
        new Set(
          alerts.map(
            (alert) => alert.id_programacion,
          ),
        ).size,
      sin_gps:
        items.filter(
          (item) =>
            item.recorrido &&
            ['SIN_DATOS', 'DESCONECTADO'].includes(
              item.gps.estado,
            ),
        ).length,
      cumplimiento_porcentaje:
        calculatePercentage(finalized, executable),
    },

    items,
  };
};

module.exports = getOperationalMonitorService;