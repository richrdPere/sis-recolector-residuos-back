'use strict';

const numero = valor =>
  valor == null || valor === '' ? NaN : Number(valor);

const verdadero = valor =>
  valor === true || valor === 1 || valor === '1';

const rad = grados => grados * Math.PI / 180;

function distanciaMetros(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) *
    Math.cos(rad(b.lat)) *
    Math.sin(dLng / 2) ** 2;

  return 6371008.8 * 2 * Math.atan2(
    Math.sqrt(Math.min(1, h)),
    Math.sqrt(Math.max(0, 1 - h)),
  );
}

// Las muestras deben estar ordenadas por fecha_dispositivo
// e id_posicion.
function calcularDistanciaGps(recorrido, muestras) {
  const inicio =
    new Date(recorrido.fecha_hora_inicio).getTime();

  const fin = recorrido.fecha_hora_finalizacion == null
    ? Date.now()
    : new Date(
      recorrido.fecha_hora_finalizacion,
    ).getTime();

  let anterior = null;
  let metros = 0;
  let tramos = 0;
  let descartadas = 0;

  for (const muestra of muestras) {
    const punto = {
      lat: numero(muestra.latitud),
      lng: numero(muestra.longitud),
      precision: numero(muestra.precision_gps),
      velocidad: numero(muestra.velocidad_mps),

      fecha: muestra.fecha_dispositivo == null
        ? NaN
        : new Date(muestra.fecha_dispositivo).getTime(),
    };

    if (
      !verdadero(muestra.es_valida) ||
      verdadero(muestra.es_ubicacion_simulada) ||
      !Number.isFinite(inicio) ||
      !Number.isFinite(fin) ||
      !Number.isFinite(punto.lat) ||
      Math.abs(punto.lat) > 90 ||
      !Number.isFinite(punto.lng) ||
      Math.abs(punto.lng) > 180 ||
      !Number.isFinite(punto.precision) ||
      punto.precision < 0 ||
      punto.precision > 50 ||
      !Number.isFinite(punto.fecha) ||
      punto.fecha < inicio ||
      punto.fecha > fin
    ) {
      descartadas++;
      anterior = null;
      continue;
    }

    if (anterior == null) {
      anterior = punto;
      continue;
    }

    const segundos =
      (punto.fecha - anterior.fecha) / 1000;

    // No sumar posiciones repetidas o fuera de orden.
    if (segundos <= 0) {
      descartadas++;
      continue;
    }

    // No inventar distancia entre segmentos sin seguimiento.
    if (segundos > 120) {
      anterior = punto;
      continue;
    }

    const distancia = distanciaMetros(anterior, punto);

    // Filtro de saltos: desplazamiento superior a 100 km/h.
    if (distancia / segundos > 100 / 3.6) {
      descartadas++;
      anterior = null;
      continue;
    }

    tramos++;

    const detenido =
      Number.isFinite(anterior.velocidad) &&
      Number.isFinite(punto.velocidad) &&
      anterior.velocidad >= 0 &&
      punto.velocidad >= 0 &&
      anterior.velocidad < 0.5 &&
      punto.velocidad < 0.5;

    if (detenido) {
      anterior = punto;
      continue;
    }

    // Reducir la acumulación por pequeñas oscilaciones GPS.
    const umbral = Math.max(
      5,
      Math.min(
        20,
        Math.max(
          anterior.precision,
          punto.precision,
        ),
      ),
    );

    // Mantener el punto anterior para acumular desplazamientos
    // pequeños hasta superar el umbral.
    if (distancia < umbral) continue;

    metros += distancia;
    anterior = punto;
  }

  return {
    metros: tramos > 0
      ? Math.round(metros * 100) / 100
      : null,

    kilometros: tramos > 0
      ? Math.round(metros) / 1000
      : null,

    tramos_evaluados: tramos,
    muestras_descartadas: descartadas,

    metodo: 'GPS_ESTIMADO',

    nota:
      'Estimación con las posiciones GPS recibidas. ' +
      'Los huecos de más de 120 segundos no se suman.',
  };
}

module.exports = calcularDistanciaGps;