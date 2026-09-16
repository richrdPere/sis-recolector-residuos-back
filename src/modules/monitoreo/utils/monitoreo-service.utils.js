const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  ACTIVE_ROUTE_STATES,
  DEFAULT_GPS_ONLINE_SECONDS,
  DEFAULT_GPS_DELAYED_SECONDS,
  DEFAULT_START_TOLERANCE_MINUTES,
  DEFAULT_PAUSE_ALERT_MINUTES,
  DEFAULT_CAPACITY_WARNING_PERCENT,
  DEFAULT_CAPACITY_CRITICAL_PERCENT,
} = require('./monitoreo.constants');

const {
  ProgramacionRuta,
  Recorrido,
} = db;

const toPlain = (instance) => {
  if (!instance) return null;

  return typeof instance.get === 'function'
    ? instance.get({ plain: true })
    : instance;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((toNumber(value) + Number.EPSILON) * factor) / factor;
};

const calculatePercentage = (
  numerator,
  denominator,
  decimals = 2,
) => {
  const total = toNumber(denominator);

  if (total <= 0) return 0;

  return round(
    (toNumber(numerator) / total) * 100,
    decimals,
  );
};

const secondsBetween = (from, to = new Date()) => {
  if (!from) return null;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime())
  ) {
    return null;
  }

  return Math.max(
    Math.floor((toDate.getTime() - fromDate.getTime()) / 1000),
    0,
  );
};

const combineDateAndTime = (date, time) => {
  if (!date || !time) return null;

  // Sin sufijo Z: se interpreta con la zona horaria configurada en Node.
  const result = new Date(
    `${date}T${String(time).slice(0, 8)}`,
  );

  return Number.isNaN(result.getTime())
    ? null
    : result;
};

const getLocationTimestamp = (location) => (
  location?.fecha_posicion ||
  location?.fecha_ubicacion ||
  location?.fecha_recepcion ||
  location?.updated_at ||
  location?.created_at ||
  null
);

const getGpsStatus = (
  location,
  referenceDate = new Date(),
) => {
  if (!location) {
    return {
      estado: 'SIN_DATOS',
      segundos_sin_actualizar: null,
      fecha_ultima_posicion: null,
    };
  }

  const timestamp = getLocationTimestamp(location);
  const elapsed = secondsBetween(timestamp, referenceDate);

  if (elapsed === null) {
    return {
      estado: 'SIN_DATOS',
      segundos_sin_actualizar: null,
      fecha_ultima_posicion: timestamp,
    };
  }

  let estado = 'DESCONECTADO';

  if (elapsed <= DEFAULT_GPS_ONLINE_SECONDS) {
    estado = 'EN_LINEA';
  } else if (elapsed <= DEFAULT_GPS_DELAYED_SECONDS) {
    estado = 'DEMORADO';
  }

  return {
    estado,
    segundos_sin_actualizar: elapsed,
    fecha_ultima_posicion: timestamp,
  };
};

const getCollectionState = (collection) => (
  collection?.estado_recoleccion ||
  collection?.estado ||
  'REGISTRADA'
);

const isAnnulledCollection = (collection) => (
  ['ANULADA', 'ANULADO', 'CANCELADA', 'CANCELADO'].includes(
    String(getCollectionState(collection)).toUpperCase(),
  )
);

const getRoutePoints = (programming) => (
  programming?.version_ruta?.puntos || []
);

const getMandatoryPoints = (programming) => (
  getRoutePoints(programming).filter(
    (point) =>
      point.estado !== false &&
      point.es_obligatorio !== false,
  )
);

const calculateRouteProgress = (programming, route) => {
  const mandatoryPoints = getMandatoryPoints(programming);
  const validCollections = (route?.recolecciones || [])
    .filter((collection) => !isAnnulledCollection(collection));

  const attendedPointIds = new Set(
    validCollections
      .map((collection) => Number(collection.id_ruta_punto))
      .filter(Number.isInteger),
  );

  const attended = mandatoryPoints.filter(
    (point) => attendedPointIds.has(Number(point.id_ruta_punto)),
  ).length;

  const total = mandatoryPoints.length;

  return {
    total_puntos: total,
    atendidos: attended,
    pendientes: Math.max(total - attended, 0),
    porcentaje: calculatePercentage(attended, total),
  };
};

/*
 * Adaptador de capacidad.
 *
 * Admite una relación resumen llamada capacidad, capacidad_actual o
 * control_capacidad. Si el proyecto usa otro alias, solo debe modificarse
 * esta función.
 */
const calculateCapacity = (route) => {
  const capacity =
    route?.capacidad ||
    route?.capacidad_actual ||
    route?.control_capacidad ||
    null;

  if (!capacity) {
    return {
      disponible: false,
      cantidad_acumulada: 0,
      capacidad_maxima: 0,
      unidad_medida: null,
      porcentaje: 0,
      nivel: 'SIN_DATOS',
    };
  }

  const accumulated = toNumber(
    capacity.cantidad_acumulada ??
    capacity.cantidad_actual ??
    capacity.valor_acumulado,
  );

  const maximum = toNumber(
    capacity.capacidad_maxima ??
    capacity.capacidad_vehiculo ??
    capacity.limite,
  );

  const percentage =
    capacity.porcentaje_capacidad !== undefined
      ? toNumber(capacity.porcentaje_capacidad)
      : calculatePercentage(accumulated, maximum);

  let level = 'NORMAL';

  if (percentage >= DEFAULT_CAPACITY_CRITICAL_PERCENT) {
    level = 'COMPLETA';
  } else if (percentage >= DEFAULT_CAPACITY_WARNING_PERCENT) {
    level = 'ADVERTENCIA';
  }

  return {
    disponible: true,
    cantidad_acumulada: accumulated,
    capacidad_maxima: maximum,
    unidad_medida:
      capacity.unidad_medida ||
      capacity.unidad ||
      null,
    porcentaje: round(percentage),
    nivel: level,
  };
};

const buildProgrammingWhere = (filters) => {
  const where = {
    fecha_programada: filters.fecha,
  };

  if (filters.id_ruta) {
    where.id_ruta = filters.id_ruta;
  }

  if (filters.id_vehiculo) {
    where.id_vehiculo = filters.id_vehiculo;
  }

  if (filters.estado_programacion) {
    where.estado_programacion = filters.estado_programacion;
  }

  return where;
};

const buildRouteWhere = (
  filters,
  { activeOnly = false } = {},
) => {
  const where = {};

  if (activeOnly) {
    where.estado_recorrido = {
      [Op.in]: ACTIVE_ROUTE_STATES,
    };
  }

  if (filters.estado_recorrido) {
    where.estado_recorrido = filters.estado_recorrido;
  }

  return where;
};

const getCapacityInclude = () => {
  const association = [
    'capacidad',
    'capacidad_actual',
    'control_capacidad',
  ].find((alias) => Recorrido.associations?.[alias]);

  return association
    ? [{ association, required: false }]
    : [];
};

const getProgrammingIncludes = ({
  includeRoute = true,
  includeRoutePoints = true,
  includeVehicle = true,
  includeStaff = false,
  includeJourney = true,
  routeRequired = false,
} = {}) => {
  const include = [];

  if (includeRoute) {
    include.push({
      association: 'ruta',
      required: routeRequired,
      include: [
        {
          association: 'zona',
          required: false,
        },
      ],
    });
  }

  if (includeRoutePoints) {
    include.push({
      association: 'version_ruta',
      required: false,
      include: [
        {
          association: 'puntos',
          required: false,
          where: {
            estado: true,
          },
        },
      ],
    });
  }

  if (includeVehicle) {
    include.push({
      association: 'vehiculo',
      required: false,
    });
  }

  if (includeStaff) {
    include.push({
      association: 'personal_asignado',
      required: false,
      where: {
        estado_asignacion: {
          [Op.notIn]: ['RECHAZADO', 'RETIRADO'],
        },
      },
      include: [
        {
          association: 'personal',
          required: false,
        },
      ],
    });
  }

  if (includeJourney) {
    include.push({
      association: 'recorrido',
      required: false,
      include: [
        {
          association: 'ultima_ubicacion',
          required: false,
        },
        {
          association: 'recolecciones',
          required: false,
        },
        ...getCapacityInclude(),
      ],
    });
  }

  return include;
};

const getRouteOrFail = async (
  idRecorrido,
  options = {},
) => {
  const route = await Recorrido.findByPk(
    idRecorrido,
    options,
  );

  if (!route) {
    throw new AppError(
      'El recorrido no fue encontrado.',
      404,
      'ROUTE_JOURNEY_NOT_FOUND',
    );
  }

  return route;
};

const getProgrammingOrFail = async (
  idProgramacion,
  options = {},
) => {
  const programming = await ProgramacionRuta.findByPk(
    idProgramacion,
    options,
  );

  if (!programming) {
    throw new AppError(
      'La programación no fue encontrada.',
      404,
      'PROGRAMMING_NOT_FOUND',
    );
  }

  return programming;
};

const mapRouteMonitorItem = (
  programmingInstance,
  referenceDate = new Date(),
) => {
  const programming = toPlain(programmingInstance);
  const route = programming.recorrido || null;
  const location = route?.ultima_ubicacion || null;
  const gps = getGpsStatus(location, referenceDate);
  const progress = calculateRouteProgress(programming, route);
  const capacity = calculateCapacity(route);

  const scheduledStart = combineDateAndTime(
    programming.fecha_programada,
    programming.hora_inicio_programada,
  );

  const scheduledEnd = combineDateAndTime(
    programming.fecha_programada,
    programming.hora_fin_programada,
  );

  return {
    id_programacion: programming.id_programacion,
    estado_programacion: programming.estado_programacion,
    fecha_programada: programming.fecha_programada,
    hora_inicio_programada: programming.hora_inicio_programada,
    hora_fin_programada: programming.hora_fin_programada,
    turno: programming.turno,

    ruta: programming.ruta
      ? {
        id_ruta: programming.ruta.id_ruta,
        nombre:
          programming.ruta.nombre ||
          programming.ruta.nombre_ruta,
        zona: programming.ruta.zona || null,
      }
      : null,

    vehiculo: programming.vehiculo || null,

    recorrido: route
      ? {
        id_recorrido: route.id_recorrido,
        estado_recorrido: route.estado_recorrido,
        fecha_hora_inicio: route.fecha_hora_inicio,
        fecha_hora_finalizacion:
          route.fecha_hora_finalizacion,
        duracion_segundos:
          route.duracion_segundos ??
          secondsBetween(route.fecha_hora_inicio, referenceDate),
        distancia_recorrida_metros:
          toNumber(route.distancia_recorrida_metros),
      }
      : null,

    ultima_ubicacion: location,
    gps,
    progreso: progress,
    capacidad: capacity,

    control_horario: {
      inicio_programado: scheduledStart,
      fin_programado: scheduledEnd,
      minutos_retraso_inicio:
        !route && scheduledStart
          ? Math.max(
            Math.floor(
              (referenceDate.getTime() - scheduledStart.getTime()) /
              60000,
            ),
            0,
          )
          : 0,
    },
  };
};

const buildOperationalAlerts = (
  items,
  referenceDate = new Date(),
) => {
  const alerts = [];

  for (const item of items) {
    const base = {
      id_programacion: item.id_programacion,
      id_recorrido: item.recorrido?.id_recorrido || null,
      ruta: item.ruta,
      vehiculo: item.vehiculo,
    };

    const delay =
      item.control_horario?.minutos_retraso_inicio || 0;

    if (
      !item.recorrido &&
      !['FINALIZADA', 'CANCELADA'].includes(
        item.estado_programacion,
      ) &&
      delay > DEFAULT_START_TOLERANCE_MINUTES
    ) {
      alerts.push({
        ...base,
        codigo: 'PROGRAMACION_RETRASADA',
        nivel: 'ADVERTENCIA',
        mensaje:
          `La programación presenta ${delay} minutos de retraso.`,
        valor: delay,
        unidad: 'MINUTOS',
      });
    }

    if (
      item.recorrido &&
      ACTIVE_ROUTE_STATES.includes(
        item.recorrido.estado_recorrido,
      ) &&
      ['SIN_DATOS', 'DESCONECTADO'].includes(item.gps.estado)
    ) {
      alerts.push({
        ...base,
        codigo: 'GPS_SIN_CONEXION',
        nivel: 'CRITICA',
        mensaje:
          item.gps.estado === 'SIN_DATOS'
            ? 'El recorrido todavía no registra una ubicación GPS.'
            : 'El vehículo dejó de transmitir su ubicación GPS.',
        valor: item.gps.segundos_sin_actualizar,
        unidad: 'SEGUNDOS',
      });
    } else if (
      item.recorrido &&
      item.gps.estado === 'DEMORADO'
    ) {
      alerts.push({
        ...base,
        codigo: 'GPS_DEMORADO',
        nivel: 'ADVERTENCIA',
        mensaje:
          'La última ubicación GPS presenta demora.',
        valor: item.gps.segundos_sin_actualizar,
        unidad: 'SEGUNDOS',
      });
    }

    if (
      item.recorrido?.estado_recorrido === 'PAUSADO'
    ) {
      const pauseStart =
        item.recorrido.fecha_hora_pausa ||
        item.recorrido.updated_at;

      const pauseMinutes = Math.floor(
        (secondsBetween(pauseStart, referenceDate) || 0) / 60,
      );

      if (pauseMinutes >= DEFAULT_PAUSE_ALERT_MINUTES) {
        alerts.push({
          ...base,
          codigo: 'PAUSA_PROLONGADA',
          nivel: 'ADVERTENCIA',
          mensaje:
            `El recorrido lleva ${pauseMinutes} minutos pausado.`,
          valor: pauseMinutes,
          unidad: 'MINUTOS',
        });
      }
    }

    if (item.capacidad.nivel === 'COMPLETA') {
      alerts.push({
        ...base,
        codigo: 'CAPACIDAD_COMPLETA',
        nivel: 'CRITICA',
        mensaje:
          'El vehículo alcanzó o superó su capacidad máxima.',
        valor: item.capacidad.porcentaje,
        unidad: 'PORCENTAJE',
      });
    } else if (item.capacidad.nivel === 'ADVERTENCIA') {
      alerts.push({
        ...base,
        codigo: 'CAPACIDAD_ADVERTENCIA',
        nivel: 'ADVERTENCIA',
        mensaje:
          'El vehículo se aproxima a su capacidad máxima.',
        valor: item.capacidad.porcentaje,
        unidad: 'PORCENTAJE',
      });
    }
  }

  return alerts;
};

module.exports = {
  toPlain,
  toNumber,
  round,
  calculatePercentage,
  secondsBetween,
  combineDateAndTime,
  getGpsStatus,
  calculateRouteProgress,
  calculateCapacity,
  buildProgrammingWhere,
  buildRouteWhere,
  getCapacityInclude,
  getProgrammingIncludes,
  getRouteOrFail,
  getProgrammingOrFail,
  mapRouteMonitorItem,
  buildOperationalAlerts,
};