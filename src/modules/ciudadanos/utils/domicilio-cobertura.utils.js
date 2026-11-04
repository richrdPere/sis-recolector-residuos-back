const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// ==========================================================
// VALIDAR COORDENADAS
// ==========================================================

const validarCoordenadasDomicilio = ({
  latitud,
  longitud,
}) => {
  for (const [campo, valor] of Object.entries({
    latitud,
    longitud,
  })) {
    if (
      !['number', 'string'].includes(typeof valor) ||
      (typeof valor === 'string' && !valor.trim())
    ) {
      throw new AppError(
        `El campo ${campo} debe ser numérico.`,
        400,
        'INVALID_COORDINATES',
      );
    }
  }

  const lat = Number(latitud);
  const lng = Number(longitud);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new AppError(
      'Las coordenadas del domicilio no son válidas.',
      400,
      'INVALID_COORDINATES',
    );
  }

  return {
    latitud: lat,
    longitud: lng,
  };
};

// ==========================================================
// GEOMETRÍA
// GeoJSON: [longitud, latitud]
// ==========================================================

const geometriaInvalida = () => {
  throw new AppError(
    'La zona tiene un polígono inválido. Contacte al administrador.',
    500,
    'INVALID_ZONE_GEOMETRY',
  );
};

const obtenerPoligonos = (value) => {
  let geometry = value;

  if (typeof geometry === 'string') {
    try {
      geometry = JSON.parse(geometry);
    } catch {
      geometriaInvalida();
    }
  }

  if (
    !geometry ||
    !['Polygon', 'MultiPolygon'].includes(geometry.type) ||
    !Array.isArray(geometry.coordinates) ||
    !geometry.coordinates.length
  ) {
    geometriaInvalida();
  }

  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !polygon.length) {
      geometriaInvalida();
    }

    for (const ring of polygon) {
      if (!Array.isArray(ring) || ring.length < 4) {
        geometriaInvalida();
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
          geometriaInvalida();
        }
      }

      const first = ring[0];
      const last = ring[ring.length - 1];

      if (
        first[0] !== last[0] ||
        first[1] !== last[1]
      ) {
        geometriaInvalida();
      }
    }
  }

  return polygons;
};

const ubicacionEnAnillo = ([x, y], ring) => {
  const epsilon = 1e-10;
  let inside = false;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const [ax, ay] = ring[i];
    const [bx, by] = ring[i + 1];

    const dx = bx - ax;
    const dy = by - ay;

    const length = Math.hypot(dx, dy);
    const cross = (x - ax) * dy - (y - ay) * dx;

    const withinBounds =
      x >= Math.min(ax, bx) - epsilon &&
      x <= Math.max(ax, bx) + epsilon &&
      y >= Math.min(ay, by) - epsilon &&
      y <= Math.max(ay, by) + epsilon;

    const onSegment =
      length === 0
        ? Math.hypot(x - ax, y - ay) <= epsilon
        : Math.abs(cross) <= epsilon * length &&
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

const contieneUbicacion = (
  geometry,
  latitud,
  longitud,
) => {
  const point = [longitud, latitud];

  return obtenerPoligonos(geometry).some((polygon) => {
    if (
      ubicacionEnAnillo(point, polygon[0]) === 'FUERA'
    ) {
      return false;
    }

    // Excluir el interior de los huecos.
    return polygon.slice(1).every(
      (ring) =>
        ubicacionEnAnillo(point, ring) !== 'DENTRO',
    );
  });
};

// ==========================================================
// PERFIL HABILITADO
// ==========================================================

const validarCiudadanoHabilitado = (ciudadano) => {
  if (
    ciudadano.estado_ciudadano !== 'ACTIVO' ||
    ciudadano.acepta_tratamiento_datos !== true
  ) {
    throw new AppError(
      'Se requiere un perfil ciudadano activo y consentimiento vigente.',
      409,
      'CITIZEN_NOT_ELIGIBLE',
    );
  }
};

// ==========================================================
// VALIDAR COBERTURA AL GUARDAR
// ==========================================================

const validarCoberturaDomicilio = async ({
  idZona,
  idRuta = null,
  latitud,
  longitud,
  transaction,
}) => {
  const coordinates = validarCoordenadasDomicilio({
    latitud,
    longitud,
  });

  const options = {
    transaction,

    ...(transaction
      ? {
        lock: transaction.LOCK.UPDATE,
      }
      : {}),
  };

  const zona = await db.Zona.findByPk(
    idZona,
    options,
  );

  if (!zona || !zona.estado) {
    throw new AppError(
      'La zona no existe o está inactiva.',
      409,
      'ZONE_NOT_ACTIVE',
    );
  }

  if (!zona.poligono_geojson) {
    throw new AppError(
      'La zona no tiene cobertura geográfica configurada.',
      409,
      'ZONE_WITHOUT_GEOMETRY',
    );
  }

  if (
    !contieneUbicacion(
      zona.poligono_geojson,
      coordinates.latitud,
      coordinates.longitud,
    )
  ) {
    throw new AppError(
      'La ubicación no pertenece a la zona seleccionada. Consulta nuevamente su cobertura.',
      409,
      'ADDRESS_OUTSIDE_ZONE',
    );
  }

  if (idRuta != null) {
    const ruta = await db.Ruta.findByPk(
      idRuta,
      options,
    );

    if (!ruta || !ruta.estado) {
      throw new AppError(
        'La ruta no existe o está inactiva.',
        409,
        'ROUTE_NOT_ACTIVE',
      );
    }

    if (
      String(ruta.id_zona) !== String(zona.id_zona)
    ) {
      throw new AppError(
        'La ruta no pertenece a la zona seleccionada.',
        409,
        'ROUTE_ZONE_MISMATCH',
      );
    }
  }

  return coordinates;
};

module.exports = {
  validarCoordenadasDomicilio,
  validarCiudadanoHabilitado,
  validarCoberturaDomicilio,
  contieneUbicacion,
};