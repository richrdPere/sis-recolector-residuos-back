'use strict';

function option(name, fallback, min, max) {
  const value = Number(
    process.env[name] ?? fallback,
  );

  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `Configuración GPS no válida: ${name}`,
    );
  }

  return value;
}

const GPS = Object.freeze({
  precisionMaxima: option(
    'GPS_PRECISION_MAX_METROS',
    50,
    1,
    1000,
  ),

  velocidadMaxima: option(
    'GPS_VELOCIDAD_MAX_MPS',
    45,
    1,
    100,
  ),

  saltoVentanaSegundos: option(
    'GPS_SALTO_VENTANA_SEGUNDOS',
    120,
    1,
    3600,
  ),

  vivoMaxSegundos: option(
    'GPS_VIVO_MAX_SEGUNDOS',
    120,
    1,
    3600,
  ),

  futuroMaxSegundos: option(
    'GPS_FUTURO_MAX_SEGUNDOS',
    5,
    0,
    300,
  ),
});

function number(value) {
  if (
    value == null ||
    value === '' ||
    typeof value === 'boolean'
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function distance(first, second) {
  const rad = value =>
    value * Math.PI / 180;

  const lat1 = rad(Number(first.latitud));
  const lat2 = rad(Number(second.latitud));

  const deltaLat = lat2 - lat1;

  const deltaLng = rad(
    Number(second.longitud) -
    Number(first.longitud),
  );

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(deltaLng / 2) ** 2;

  return 6371000 *
    2 *
    Math.asin(
      Math.sqrt(
        Math.min(1, Math.max(0, h)),
      ),
    );
}

function evaluarCalidadGps(
  location,
  previous = null,
  now = new Date(),
) {
  const invalid = code => ({
    es_valida: false,
    motivo_invalidez: code,
  });

  if (location.es_ubicacion_simulada === true) {
    return invalid('GPS_SIMULADO');
  }

  const lat = number(location.latitud);
  const lng = number(location.longitud);

  if (
    lat == null ||
    lng == null ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return invalid('GPS_COORDENADAS_INVALIDAS');
  }

  const accuracy =
    number(location.precision_gps);

  if (accuracy == null || accuracy <= 0) {
    return invalid('GPS_PRECISION_DESCONOCIDA');
  }

  if (accuracy > GPS.precisionMaxima) {
    return invalid('GPS_PRECISION_INSUFICIENTE');
  }

  const timestamp =
    new Date(
      location.fecha_dispositivo,
    ).getTime();

  if (
    !Number.isFinite(timestamp) ||
    timestamp >
    now.getTime() +
    GPS.futuroMaxSegundos * 1000
  ) {
    return invalid('GPS_FECHA_INVALIDA');
  }

  const speed =
    number(location.velocidad_mps);

  if (
    speed != null &&
    (
      speed < 0 ||
      speed > GPS.velocidadMaxima
    )
  ) {
    return invalid('GPS_VELOCIDAD_INCONSISTENTE');
  }

  if (previous) {
    const seconds =
      (
        timestamp -
        new Date(
          previous.fecha_dispositivo,
        ).getTime()
      ) / 1000;

    const previousAccuracy =
      number(previous.precision_gps);

    if (
      seconds > 0 &&
      seconds <= GPS.saltoVentanaSegundos &&
      previousAccuracy != null
    ) {
      // Filtro heurístico: descontar la incertidumbre
      // reportada antes de interpretar un desplazamiento.
      const minimumDistance = Math.max(
        0,
        distance(previous, location) -
        accuracy -
        previousAccuracy,
      );

      if (
        minimumDistance / seconds >
        GPS.velocidadMaxima
      ) {
        return invalid('GPS_SALTO_INCONSISTENTE');
      }
    }
  }

  // Una muestra antigua puede seguir siendo válida
  // para el historial de un recorrido offline.
  return {
    es_valida: true,
    motivo_invalidez: null,
  };
}

function aptaParaMonitoreo(
  location,
  now = new Date(),
) {
  if (!location.es_valida) return false;

  const age =
    (
      now.getTime() -
      new Date(
        location.fecha_dispositivo,
      ).getTime()
    ) / 1000;

  return (
    Number.isFinite(age) &&
    age >= -GPS.futuroMaxSegundos &&
    age <= GPS.vivoMaxSegundos
  );
}

module.exports = {
  GPS,
  evaluarCalidadGps,
  aptaParaMonitoreo,
};