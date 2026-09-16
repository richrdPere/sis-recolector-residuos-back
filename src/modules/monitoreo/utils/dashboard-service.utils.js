const { Op } = require('sequelize');
const db = require('../../../database/models');

const {
  toPlain,
  toNumber,
  round,
  calculatePercentage,
  calculateRouteProgress,
  calculateCapacity,
  getCapacityInclude,
} = require('./monitoreo-service.utils');

const {
  ProgramacionRuta,
  Vehiculo,
} = db;

const CANCELLED_COLLECTION_STATES = [
  'ANULADA',
  'ANULADO',
  'CANCELADA',
  'CANCELADO',
];

const getCollectionState = (collection) => String(
  collection?.estado_recoleccion ??
  collection?.estado ??
  'REGISTRADA',
).toUpperCase();

const isValidCollection = (collection) => (
  !CANCELLED_COLLECTION_STATES.includes(
    getCollectionState(collection),
  )
);

const getCollectionAmount = (collection) => {
  const candidates = [
    ['cantidad_recolectada', collection.cantidad_recolectada],
    ['cantidad', collection.cantidad],
    ['peso_kg', collection.peso_kg],
    ['volumen_m3', collection.volumen_m3],
  ];

  const found = candidates.find(
    ([, value]) =>
      value !== null &&
      value !== undefined &&
      value !== '',
  );

  if (!found) {
    return {
      cantidad: 0,
      unidad: null,
    };
  }

  const [field, value] = found;

  let unit =
    collection.unidad_medida ||
    collection.unidad ||
    null;

  if (!unit && field === 'peso_kg') unit = 'KG';
  if (!unit && field === 'volumen_m3') unit = 'M3';

  return {
    cantidad: toNumber(value),
    unidad: unit ? String(unit).toUpperCase() : 'SIN_UNIDAD',
  };
};

const addAmountByUnit = (target, collection) => {
  const { cantidad, unidad } = getCollectionAmount(collection);

  if (!unidad || cantidad === 0) return;

  target[unidad] = round(
    toNumber(target[unidad]) + cantidad,
  );
};

const buildDashboardWhere = (filters) => {
  const where = {
    fecha_programada: {
      [Op.between]: [
        filters.fecha_inicio,
        filters.fecha_fin,
      ],
    },
  };

  if (filters.id_ruta) {
    where.id_ruta = filters.id_ruta;
  }

  if (filters.id_vehiculo) {
    where.id_vehiculo = filters.id_vehiculo;
  }

  if (filters.id_zona) {
    where['$ruta.id_zona$'] = filters.id_zona;
  }

  return where;
};

const getDashboardDataset = async (filters) => {
  const rows = await ProgramacionRuta.findAll({
    where: buildDashboardWhere(filters),

    include: [
      {
        association: 'ruta',
        required: Boolean(filters.id_zona),
        include: [
          {
            association: 'zona',
            required: false,
          },
        ],
      },
      {
        association: 'version_ruta',
        required: false,
        include: [
          {
            association: 'puntos',
            required: false,
            where: { estado: true },
          },
        ],
      },
      {
        association: 'vehiculo',
        required: false,
      },
      {
        association: 'recorrido',
        required: false,
        include: [
          {
            association: 'recolecciones',
            required: false,
          },
          {
            association: 'ultima_ubicacion',
            required: false,
          },
          ...getCapacityInclude(),
        ],
      },
    ],

    distinct: true,
    subQuery: false,
    order: [
      ['fecha_programada', 'ASC'],
      ['hora_inicio_programada', 'ASC'],
    ],
  });

  return rows.map(toPlain);
};

const countBy = (items, selector) => {
  return items.reduce((result, item) => {
    const key = selector(item) || 'SIN_DEFINIR';
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
};

const aggregateProgrammingIndicators = (dataset) => {
  const byState = countBy(
    dataset,
    (item) => item.estado_programacion,
  );

  const total = dataset.length;
  const cancelled = byState.CANCELADA || 0;
  const executable = Math.max(total - cancelled, 0);
  const finalized = byState.FINALIZADA || 0;
  const started = dataset.filter(
    (item) => Boolean(item.recorrido),
  ).length;

  const completedRoutes = dataset
    .map((item) => item.recorrido)
    .filter(
      (route) => route?.estado_recorrido === 'FINALIZADO',
    );

  const totalDuration = completedRoutes.reduce(
    (sum, route) =>
      sum + toNumber(route.duracion_segundos),
    0,
  );

  const totalDistance = completedRoutes.reduce(
    (sum, route) =>
      sum + toNumber(route.distancia_recorrida_metros),
    0,
  );

  return {
    total,
    por_estado: byState,
    ejecutables: executable,
    iniciadas: started,
    no_iniciadas: Math.max(executable - started, 0),
    finalizadas: finalized,
    canceladas: cancelled,
    cumplimiento_porcentaje:
      calculatePercentage(finalized, executable),
    tasa_inicio_porcentaje:
      calculatePercentage(started, executable),
    duracion_promedio_minutos:
      completedRoutes.length
        ? round(
          totalDuration / completedRoutes.length / 60,
        )
        : 0,
    distancia_total_km: round(totalDistance / 1000),
  };
};

const aggregateCollectionIndicators = (dataset) => {
  let totalPoints = 0;
  let attendedPoints = 0;
  let validRecords = 0;
  let annulledRecords = 0;
  let withEvidence = 0;
  const amountsByUnit = {};

  for (const programming of dataset) {
    const route = programming.recorrido;
    const progress = calculateRouteProgress(
      programming,
      route,
    );

    totalPoints += progress.total_puntos;
    attendedPoints += progress.atendidos;

    for (const collection of route?.recolecciones || []) {
      if (!isValidCollection(collection)) {
        annulledRecords += 1;
        continue;
      }

      validRecords += 1;
      addAmountByUnit(amountsByUnit, collection);

      const evidenceCount =
        collection.evidencias?.length ||
        toNumber(collection.cantidad_evidencias);

      if (evidenceCount > 0) {
        withEvidence += 1;
      }
    }
  }

  return {
    puntos_programados: totalPoints,
    puntos_atendidos: attendedPoints,
    puntos_pendientes:
      Math.max(totalPoints - attendedPoints, 0),
    avance_porcentaje:
      calculatePercentage(attendedPoints, totalPoints),
    registros_validos: validRecords,
    registros_anulados: annulledRecords,
    registros_con_evidencia: withEvidence,
    registros_sin_evidencia:
      Math.max(validRecords - withEvidence, 0),
    cantidades_por_unidad: amountsByUnit,
  };
};

const getVehicleStatus = (vehicle) => String(
  vehicle?.estado_operativo ??
  vehicle?.estado_vehiculo ??
  vehicle?.estado ??
  'SIN_DEFINIR',
).toUpperCase();

const getVehiclesForDashboard = async () => {
  return Vehiculo.findAll({
    order: [['id_vehiculo', 'ASC']],
  }).then((rows) => rows.map(toPlain));
};

const aggregateVehicleIndicators = (
  dataset,
  vehicles,
) => {
  const activeRows = dataset.filter(
    (item) =>
      item.recorrido &&
      ['EN_CURSO', 'PAUSADO'].includes(
        item.recorrido.estado_recorrido,
      ),
  );

  const activeVehicleIds = new Set(
    activeRows.map((item) => Number(item.id_vehiculo)),
  );

  let capacityWarning = 0;
  let capacityFull = 0;

  for (const item of activeRows) {
    const capacity = calculateCapacity(item.recorrido);

    if (capacity.nivel === 'ADVERTENCIA') {
      capacityWarning += 1;
    }

    if (capacity.nivel === 'COMPLETA') {
      capacityFull += 1;
    }
  }

  const byStatus = countBy(vehicles, getVehicleStatus);

  const unavailableStates = new Set([
    'FUERA_SERVICIO',
    'MANTENIMIENTO',
    'INACTIVO',
    'BAJA',
    'FALSE',
  ]);

  const operational = vehicles.filter(
    (vehicle) => !unavailableStates.has(getVehicleStatus(vehicle)),
  ).length;

  return {
    total: vehicles.length,
    por_estado: byStatus,
    operativos: operational,
    en_recorrido: activeVehicleIds.size,
    disponibles: Math.max(
      operational - activeVehicleIds.size,
      0,
    ),
    fuera_servicio:
      Math.max(vehicles.length - operational, 0),
    cerca_capacidad: capacityWarning,
    capacidad_completa: capacityFull,
  };
};

const getPeriodKey = (dateValue, grouping) => {
  const date = new Date(`${dateValue}T00:00:00.000Z`);

  if (grouping === 'MES') {
    return dateValue.slice(0, 7);
  }

  if (grouping === 'SEMANA') {
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - day + 1);
    return date.toISOString().slice(0, 10);
  }

  return dateValue;
};

const buildTrendSeries = (dataset, grouping) => {
  const groups = new Map();

  for (const programming of dataset) {
    const key = getPeriodKey(
      programming.fecha_programada,
      grouping,
    );

    if (!groups.has(key)) {
      groups.set(key, {
        periodo: key,
        programaciones: 0,
        iniciadas: 0,
        finalizadas: 0,
        canceladas: 0,
        puntos_programados: 0,
        puntos_atendidos: 0,
        cantidades_por_unidad: {},
      });
    }

    const group = groups.get(key);
    group.programaciones += 1;

    if (programming.recorrido) group.iniciadas += 1;
    if (programming.estado_programacion === 'FINALIZADA') {
      group.finalizadas += 1;
    }
    if (programming.estado_programacion === 'CANCELADA') {
      group.canceladas += 1;
    }

    const progress = calculateRouteProgress(
      programming,
      programming.recorrido,
    );

    group.puntos_programados += progress.total_puntos;
    group.puntos_atendidos += progress.atendidos;

    for (
      const collection of
      programming.recorrido?.recolecciones || []
    ) {
      if (isValidCollection(collection)) {
        addAmountByUnit(
          group.cantidades_por_unidad,
          collection,
        );
      }
    }
  }

  return [...groups.values()]
    .sort((a, b) => a.periodo.localeCompare(b.periodo))
    .map((group) => ({
      ...group,
      cumplimiento_porcentaje: calculatePercentage(
        group.finalizadas,
        Math.max(
          group.programaciones - group.canceladas,
          0,
        ),
      ),
      avance_recoleccion_porcentaje: calculatePercentage(
        group.puntos_atendidos,
        group.puntos_programados,
      ),
    }));
};

const buildRoutePerformance = (dataset) => {
  const groups = new Map();

  for (const programming of dataset) {
    const routeId = Number(programming.id_ruta);

    if (!groups.has(routeId)) {
      groups.set(routeId, {
        id_ruta: routeId,
        ruta:
          programming.ruta?.nombre ||
          programming.ruta?.nombre_ruta ||
          `Ruta ${routeId}`,
        zona: programming.ruta?.zona || null,
        programaciones: 0,
        finalizadas: 0,
        canceladas: 0,
        puntos_programados: 0,
        puntos_atendidos: 0,
        duracion_total_segundos: 0,
        distancia_total_metros: 0,
        recorridos_finalizados: 0,
        cantidades_por_unidad: {},
      });
    }

    const group = groups.get(routeId);
    group.programaciones += 1;

    if (programming.estado_programacion === 'FINALIZADA') {
      group.finalizadas += 1;
    }

    if (programming.estado_programacion === 'CANCELADA') {
      group.canceladas += 1;
    }

    const progress = calculateRouteProgress(
      programming,
      programming.recorrido,
    );

    group.puntos_programados += progress.total_puntos;
    group.puntos_atendidos += progress.atendidos;

    if (
      programming.recorrido?.estado_recorrido === 'FINALIZADO'
    ) {
      group.recorridos_finalizados += 1;
      group.duracion_total_segundos += toNumber(
        programming.recorrido.duracion_segundos,
      );
      group.distancia_total_metros += toNumber(
        programming.recorrido.distancia_recorrida_metros,
      );
    }

    for (
      const collection of
      programming.recorrido?.recolecciones || []
    ) {
      if (isValidCollection(collection)) {
        addAmountByUnit(
          group.cantidades_por_unidad,
          collection,
        );
      }
    }
  }

  return [...groups.values()].map((group) => {
    const executable = Math.max(
      group.programaciones - group.canceladas,
      0,
    );

    return {
      id_ruta: group.id_ruta,
      ruta: group.ruta,
      zona: group.zona,
      programaciones: group.programaciones,
      finalizadas: group.finalizadas,
      canceladas: group.canceladas,
      cumplimiento_porcentaje: calculatePercentage(
        group.finalizadas,
        executable,
      ),
      puntos_programados: group.puntos_programados,
      puntos_atendidos: group.puntos_atendidos,
      avance_porcentaje: calculatePercentage(
        group.puntos_atendidos,
        group.puntos_programados,
      ),
      duracion_promedio_minutos:
        group.recorridos_finalizados
          ? round(
            group.duracion_total_segundos /
            group.recorridos_finalizados /
            60,
          )
          : 0,
      distancia_promedio_km:
        group.recorridos_finalizados
          ? round(
            group.distancia_total_metros /
            group.recorridos_finalizados /
            1000,
          )
          : 0,
      cantidades_por_unidad:
        group.cantidades_por_unidad,
    };
  });
};

module.exports = {
  getDashboardDataset,
  getVehiclesForDashboard,
  aggregateProgrammingIndicators,
  aggregateCollectionIndicators,
  aggregateVehicleIndicators,
  buildTrendSeries,
  buildRoutePerformance,
};