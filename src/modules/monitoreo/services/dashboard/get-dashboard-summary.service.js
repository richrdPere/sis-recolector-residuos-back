// Validations
const { validateDashboardFilters } = require('../../validations/dashboard.validation');

// Utils
const {
  getDashboardDataset,
  getVehiclesForDashboard,
  aggregateProgrammingIndicators,
  aggregateCollectionIndicators,
  aggregateVehicleIndicators,
  buildTrendSeries,
  buildRoutePerformance,
} = require('../../utils/dashboard-service.utils');

// =======================================================
// SERVICE: Obtener resumen del dashboard
// =======================================================
const getDashboardSummaryService = async (filters = {}) => {
  const normalizedFilters = validateDashboardFilters(filters);

  /*
   * El resumen consulta el dataset una sola vez. No debe invocar los
   * demás services porque eso repetiría las consultas con includes.
   */
  const [dataset, vehicles] = await Promise.all([
    getDashboardDataset(normalizedFilters),
    getVehiclesForDashboard(),
  ]);

  const programming = aggregateProgrammingIndicators(dataset);
  const collections = aggregateCollectionIndicators(dataset);
  const vehicleIndicators = aggregateVehicleIndicators(dataset, vehicles);
  const routePerformance = buildRoutePerformance(dataset);

  const activeRoutes = dataset.filter(
    (item) =>
      item.recorrido &&
      ['EN_CURSO', 'PAUSADO'].includes(
        item.recorrido.estado_recorrido,
      ),
  ).length;

  return {
    periodo: {
      fecha_inicio: normalizedFilters.fecha_inicio,
      fecha_fin: normalizedFilters.fecha_fin,
      dias_periodo: normalizedFilters.dias_periodo,
    },
    generado_en: new Date(),
    programaciones: programming,
    recorridos: {
      activos: activeRoutes,
      iniciados: programming.iniciadas,
      finalizados: programming.finalizadas,
      distancia_total_km:
        programming.distancia_total_km,
      duracion_promedio_minutos:
        programming.duracion_promedio_minutos,
    },
    recolecciones: collections,
    vehiculos: vehicleIndicators,

    /*
     * Se mantendrá neutral hasta implementar el módulo de incidencias.
     */
    incidencias: {
      disponible: false,
      total: 0,
      abiertas: 0,
      criticas: 0,
    },

    tendencias: buildTrendSeries(
      dataset,
      normalizedFilters.agrupacion,
    ),

    rendimiento_rutas: routePerformance
      .sort(
        (a, b) =>
          b.cumplimiento_porcentaje -
          a.cumplimiento_porcentaje,
      )
      .slice(0, 10),
  };
};

module.exports = getDashboardSummaryService;