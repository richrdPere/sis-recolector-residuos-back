const db = require('../../../../database/models');

// Validations
const { validateMonitorFilters } = require('../../validations/monitoreo.validation');

// Utils
const {
  buildProgrammingWhere,
  getProgrammingIncludes,
  mapRouteMonitorItem,
} = require('../../utils/monitoreo-service.utils');

// Constants
const { ACTIVE_ROUTE_STATES } = require('../../utils/monitoreo.constants');

// Modelos
const { ProgramacionRuta } = db;

// ==============================================================
// SERVICE: Obtener rutas activas en el mapa
// ==============================================================
const getActiveRoutesMapService = async (filters = {}) => {

  const normalizedFilters = validateMonitorFilters(filters);

  const where = buildProgrammingWhere(normalizedFilters);

  if (normalizedFilters.id_zona) {
    where['$ruta.id_zona$'] =
      normalizedFilters.id_zona;
  }

  const programaciones =
    await ProgramacionRuta.findAll({
      where,

      include: getProgrammingIncludes({
        includeRoute: true,
        includeRoutePoints: true,
        includeVehicle: true,
        includeStaff: false,
        includeJourney: true,
      }),

      distinct: true,
      subQuery: false,
      order: [
        ['hora_inicio_programada', 'ASC'],
      ],
    });

  const items = programaciones
    .map((programacion) =>
      mapRouteMonitorItem(programacion),
    )
    .filter(
      (item) =>
        item.recorrido &&
        ACTIVE_ROUTE_STATES.includes(
          item.recorrido.estado_recorrido,
        ),
    )
    .filter(
      (item) =>
        !normalizedFilters.estado_recorrido ||
        item.recorrido.estado_recorrido ===
        normalizedFilters.estado_recorrido,
    )
    .map((item) => ({
      id_programacion: item.id_programacion,
      id_recorrido: item.recorrido.id_recorrido,
      estado_recorrido:
        item.recorrido.estado_recorrido,
      ruta: item.ruta,
      vehiculo: item.vehiculo,
      ultima_ubicacion: item.ultima_ubicacion,
      gps: item.gps,
      progreso: item.progreso,
      capacidad: item.capacidad,
    }));

  return {
    fecha_consulta: normalizedFilters.fecha,
    generado_en: new Date(),
    total: items.length,
    items,
  };
};

module.exports = getActiveRoutesMapService;