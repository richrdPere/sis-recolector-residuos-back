const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  validateId,
  validateCoordinates,
} = require('../validations/ciudadano.validation');

const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

const { Zona, Ruta } = db;

// ==========================================================
// GEOMETRÍA
// GeoJSON utiliza [longitud, latitud].
// ==========================================================

const EPSILON = 1e-10;

const invalidGeometry = () => {
  throw new AppError(
    'Una zona tiene un polígono inválido. Comuníquese con el administrador.',
    500,
    'INVALID_ZONE_GEOMETRY',
  );
};

const parseGeometry = (value) => {
  let geometry = value;

  if (typeof geometry === 'string') {
    try {
      geometry = JSON.parse(geometry);
    } catch {
      invalidGeometry();
    }
  }

  if (
    !geometry ||
    !['Polygon', 'MultiPolygon'].includes(geometry.type) ||
    !Array.isArray(geometry.coordinates) ||
    geometry.coordinates.length === 0
  ) {
    invalidGeometry();
  }

  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  // Validar todos los anillos antes de evaluar el punto.
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || polygon.length === 0) {
      invalidGeometry();
    }

    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) {
        invalidGeometry();
      }

      for (const coordinate of ring) {
        if (
          !Array.isArray(coordinate) ||
          coordinate.length < 2 ||
          !Number.isFinite(coordinate[0]) ||
          !Number.isFinite(coordinate[1]) ||
          coordinate[0] < -180 ||
          coordinate[0] > 180 ||
          coordinate[1] < -90 ||
          coordinate[1] > 90
        ) {
          invalidGeometry();
        }
      }

      const first = ring[0];
      const last = ring[ring.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        invalidGeometry();
      }
    }
  }

  return polygons;
};

// Devuelve BORDE, DENTRO o FUERA.
const locateInRing = (point, ring) => {
  const [x, y] = point;

  let inside = false;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];

    const dx = bx - ax;
    const dy = by - ay;
    const length = Math.hypot(dx, dy);

    // Distancia a la recta, con tolerancia numérica.
    const cross = (x - ax) * dy - (y - ay) * dx;

    const withinBounds =
      x >= Math.min(ax, bx) - EPSILON &&
      x <= Math.max(ax, bx) + EPSILON &&
      y >= Math.min(ay, by) - EPSILON &&
      y <= Math.max(ay, by) + EPSILON;

    const onSegment =
      length === 0
        ? Math.hypot(x - ax, y - ay) <= EPSILON
        : Math.abs(cross) <= EPSILON * length &&
        withinBounds;

    if (onSegment) {
      return 'BORDE';
    }

    if (
      (ay > y) !== (by > y) &&
      x < ((bx - ax) * (y - ay)) / (by - ay) + ax
    ) {
      inside = !inside;
    }
  }

  return inside ? 'DENTRO' : 'FUERA';
};

const polygonContainsPoint = (point, polygon) => {
  const exterior = locateInRing(point, polygon[0]);

  if (exterior === 'FUERA') {
    return false;
  }

  // Excluir el interior de los huecos.
  // Los bordes, incluidos los de huecos, cuentan como cobertura.
  for (let i = 1; i < polygon.length; i += 1) {
    if (locateInRing(point, polygon[i]) === 'DENTRO') {
      return false;
    }
  }

  return true;
};

// ==========================================================
// SERVICE: RESOLVER COBERTURA POR COORDENADAS
// ==========================================================

const resolverCoberturaService = async ({
  id_usuario,
  latitud,
  longitud,
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  // Evita que Number(null), Number('') o Number(false)
  // se interpreten como coordenadas válidas.
  for (const [field, value] of Object.entries({
    latitud,
    longitud,
  })) {
    if (
      !['number', 'string'].includes(typeof value) ||
      (typeof value === 'string' && !value.trim())
    ) {
      throw new AppError(
        `El campo ${field} es obligatorio y debe ser numérico.`,
        400,
        'INVALID_COORDINATES',
      );
    }
  }

  const coordinates = validateCoordinates({
    latitud,
    longitud,
  });

  const ciudadano = await getCitizenByUserOrFail(userId);

  if (ciudadano.estado_ciudadano !== 'ACTIVO') {
    throw new AppError(
      'El perfil ciudadano no se encuentra activo.',
      409,
      'CITIZEN_PROFILE_NOT_ACTIVE',
    );
  }

  const zonas = await Zona.findAll({
    where: {
      estado: true,
      poligono_geojson: {
        [Op.ne]: null,
      },
    },

    attributes: [
      'id_zona',
      'codigo',
      'nombre',
      'color',
      'poligono_geojson',
    ],

    order: [['id_zona', 'ASC']],
    raw: true,
  });

  const point = [
    coordinates.longitud,
    coordinates.latitud,
  ];

  const coincidencias = zonas.filter((zona) => {
    const polygons = parseGeometry(zona.poligono_geojson);

    return polygons.some((polygon) =>
      polygonContainsPoint(point, polygon),
    );
  });

  const rutas = coincidencias.length
    ? await Ruta.findAll({
      where: {
        estado: true,
        id_zona: {
          [Op.in]: coincidencias.map(
            (zona) => zona.id_zona,
          ),
        },
      },

      attributes: [
        'id_ruta',
        'id_zona',
        'codigo',
        'nombre',
      ],

      order: [
        ['nombre', 'ASC'],
        ['id_ruta', 'ASC'],
      ],

      raw: true,
    })
    : [];

  const zonasCandidatas = coincidencias.map((zona) => ({
    id_zona: zona.id_zona,
    codigo: zona.codigo,
    nombre: zona.nombre,
    color: zona.color,

    rutas: rutas.filter(
      (ruta) =>
        String(ruta.id_zona) === String(zona.id_zona),
    ),
  }));

  return {
    ...coordinates,

    tiene_cobertura: zonasCandidatas.length > 0,

    requiere_seleccion_zona: zonasCandidatas.length > 1,

    // Solo se sugiere zona cuando la coincidencia es única.
    id_zona_sugerida:
      zonasCandidatas.length === 1
        ? zonasCandidatas[0].id_zona
        : null,

    zonas: zonasCandidatas,
  };
};

module.exports = resolverCoberturaService;