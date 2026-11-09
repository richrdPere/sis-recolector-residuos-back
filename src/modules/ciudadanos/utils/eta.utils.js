const numero = (valor) =>
  valor === null ||
    valor === undefined ||
    valor === ''
    ? NaN
    : Number(valor);

const verdadero = (valor) =>
  valor === true ||
  valor === 1 ||
  valor === '1';

const coordenada = (punto) => {
  const latitud = numero(punto?.latitud);
  const longitud = numero(punto?.longitud);

  if (
    !Number.isFinite(latitud) ||
    !Number.isFinite(longitud) ||
    Math.abs(latitud) > 90 ||
    Math.abs(longitud) > 180
  ) {
    return null;
  }

  return [longitud, latitud];
};

const opcion = (
  valor,
  predeterminado,
  minimo,
  maximo,
) => {
  const resultado = numero(valor);

  return (
    Number.isFinite(resultado) &&
    resultado >= minimo &&
    resultado <= maximo
  )
    ? resultado
    : predeterminado;
};

const calcularEta = ({
  estado,
  geometria,
  domicilio,
  puntos = [],
  posiciones = [],
  ahora = new Date(),
  config = {},
}) => {
  const base = {
    aproximada: true,
    calculada_en: ahora.toISOString(),

    disponible: false,
    minutos: null,
    minutos_min: null,
    minutos_max: null,
  };

  const noDisponible = (
    codigo,
    mensaje,
    extra = {},
  ) => ({
    ...base,
    codigo,
    mensaje,
    ...extra,
  });

  if (estado !== 'EN_CURSO') {
    return noDisponible(
      'PAUSADO',
      'El servicio está pausado; la llegada se recalculará al reanudarse.',
    );
  }

  const casa = coordenada(domicilio);

  if (!casa) {
    return noDisponible(
      'SIN_DOMICILIO',
      'El domicilio no tiene coordenadas válidas.',
    );
  }

  // Proyección local en metros para las rutas de Calca.
  const coseno = Math.cos(
    casa[1] * Math.PI / 180,
  );

  const xy = (coordenadas) => [
    coordenadas[0] *
    Math.PI / 180 *
    6371000 *
    coseno,

    coordenadas[1] *
    Math.PI / 180 *
    6371000,
  ];

  const distancia = (a, b) =>
    Math.hypot(
      a[0] - b[0],
      a[1] - b[1],
    );

  // ------------------------------------------------------
  // 1. Encontrar el punto cercano al domicilio
  // ------------------------------------------------------

  const casaXY = xy(casa);

  const destinos = puntos
    .filter(punto => coordenada(punto))
    .map(punto => ({
      ...punto,

      distanciaDomicilio: distancia(
        casaXY,
        xy(coordenada(punto)),
      ),
    }))
    .sort(
      (a, b) =>
        a.distanciaDomicilio -
        b.distanciaDomicilio,
    );

  const destino = destinos[0];

  const radioDomicilio = opcion(
    config.radioDomicilio,
    200,
    20,
    500,
  );

  if (
    !destino ||
    destino.distanciaDomicilio > radioDomicilio
  ) {
    return noDisponible(
      'SIN_PUNTO_CERCANO',
      'No se identificó un punto de recolección cercano a este domicilio.',
    );
  }

  const objetivo = {
    id_ruta_punto: String(
      destino.id_ruta_punto,
    ),

    nombre: destino.nombre,

    distancia_domicilio_metros: Math.round(
      destino.distanciaDomicilio,
    ),
  };

  if (
    ['ATENDIDO', 'OMITIDO'].includes(
      destino.estado_atencion,
    )
  ) {
    const resultado =
      destino.estado_atencion === 'ATENDIDO'
        ? 'atendido'
        : 'omitido';

    return noDisponible(
      `PUNTO_${destino.estado_atencion}`,
      `El punto cercano figura ${resultado}.`,
      { objetivo },
    );
  }

  // ------------------------------------------------------
  // 2. Preparar el trazado de la versión programada
  // ------------------------------------------------------

  if (
    geometria?.type !== 'LineString' ||
    !Array.isArray(geometria.coordinates) ||
    geometria.coordinates.length < 2
  ) {
    return noDisponible(
      'SIN_GEOMETRIA',
      'La ruta no tiene un trazado válido para calcular la llegada.',
    );
  }

  const ruta = [];

  for (const posicion of geometria.coordinates) {
    if (
      !Array.isArray(posicion) ||
      !coordenada({
        longitud: posicion[0],
        latitud: posicion[1],
      })
    ) {
      return noDisponible(
        'SIN_GEOMETRIA',
        'La ruta contiene coordenadas inválidas.',
      );
    }

    ruta.push(xy(posicion));
  }

  const segmentos = [];
  let acumulado = 0;

  for (
    let indice = 1;
    indice < ruta.length;
    indice++
  ) {
    const inicio = ruta[indice - 1];
    const fin = ruta[indice];

    const longitud = distancia(
      inicio,
      fin,
    );

    if (longitud > 0) {
      segmentos.push({
        inicio,
        fin,
        longitud,
        acumulado,
      });
    }

    acumulado += longitud;
  }

  if (!segmentos.length) {
    return noDisponible(
      'SIN_GEOMETRIA',
      'La ruta no contiene segmentos utilizables.',
    );
  }

  const proyectar = (punto) => {
    const posicion = xy(
      coordenada(punto),
    );

    const candidatos = segmentos
      .map(segmento => {
        const dx =
          segmento.fin[0] -
          segmento.inicio[0];

        const dy =
          segmento.fin[1] -
          segmento.inicio[1];

        const proporcion = Math.max(
          0,
          Math.min(
            1,
            (
              (
                posicion[0] -
                segmento.inicio[0]
              ) * dx +
              (
                posicion[1] -
                segmento.inicio[1]
              ) * dy
            ) /
            (
              segmento.longitud *
              segmento.longitud
            ),
          ),
        );

        const proyectada = [
          segmento.inicio[0] +
          proporcion * dx,

          segmento.inicio[1] +
          proporcion * dy,
        ];

        return {
          avance:
            segmento.acumulado +
            proporcion * segmento.longitud,

          distancia: distancia(
            posicion,
            proyectada,
          ),
        };
      })
      .sort(
        (a, b) =>
          a.distancia - b.distancia,
      );

    const mejor = candidatos[0];

    // En un cruce o tramo repetido puede haber
    // dos ubicaciones posibles sobre la misma ruta.
    const ambigua = candidatos.some(
      candidato =>
        Math.abs(
          candidato.avance -
          mejor.avance,
        ) > 80 &&
        candidato.distancia <=
        mejor.distancia + 10,
    );

    return {
      ...mejor,
      ambigua,
    };
  };

  // ------------------------------------------------------
  // 3. Validar la calidad y antigüedad del GPS
  // ------------------------------------------------------

  const posicionUtilizable = (posicion) => {
    if (
      !coordenada(posicion) ||
      !verdadero(posicion?.es_valida) ||
      verdadero(
        posicion.es_ubicacion_simulada,
      )
    ) {
      return false;
    }

    const precision = numero(
      posicion.precision_gps,
    );

    const fecha = posicion.fecha_dispositivo
      ? new Date(
        posicion.fecha_dispositivo,
      ).getTime()
      : NaN;

    const recepcion = posicion.fecha_recepcion
      ? new Date(
        posicion.fecha_recepcion,
      ).getTime()
      : NaN;

    const antiguedad =
      ahora.getTime() - fecha;

    const antiguedadRecepcion =
      ahora.getTime() - recepcion;

    return (
      Number.isFinite(antiguedad) &&
      Number.isFinite(antiguedadRecepcion) &&

      antiguedad >= -10000 &&
      antiguedad <= 120000 &&

      antiguedadRecepcion >= -10000 &&
      antiguedadRecepcion <= 120000 &&

      Number.isFinite(precision) &&
      precision >= 0 &&
      precision <= 50
    );
  };

  const actual = posiciones[0];

  if (!posicionUtilizable(actual)) {
    return noDisponible(
      'GPS_NO_UTILIZABLE',
      'No hay una ubicación GPS reciente y precisa para estimar la llegada.',
      { objetivo },
    );
  }

  const camion = proyectar(actual);
  const meta = proyectar(destino);

  if (
    camion.ambigua ||
    meta.ambigua
  ) {
    return noDisponible(
      'POSICION_AMBIGUA',
      'El trazado tiene cruces o tramos repetidos; no se puede estimar la llegada con suficiente claridad.',
      { objetivo },
    );
  }

  if (
    camion.distancia > 100 ||
    meta.distancia > 50
  ) {
    return noDisponible(
      'FUERA_DEL_TRAZADO',
      'El vehículo o el punto cercano no se pueden situar sobre el trazado de la ruta.',
      { objetivo },
    );
  }

  const distanciaRestante =
    meta.avance - camion.avance;

  if (distanciaRestante < -50) {
    return noDisponible(
      'TRAMO_SUPERADO',
      'El vehículo parece haber superado el punto cercano; su atención todavía no está confirmada.',
      { objetivo },
    );
  }

  if (
    Math.abs(distanciaRestante) <= 50
  ) {
    return noDisponible(
      'CERCA_DEL_PUNTO',
      'El vehículo se encuentra cerca del punto de recolección.',
      { objetivo },
    );
  }

  // ------------------------------------------------------
  // 4. Confirmar avance reciente
  // ------------------------------------------------------

  const anterior = posiciones
    .slice(1)
    .find(posicion => {
      const diferencia =
        new Date(actual.fecha_dispositivo) -
        new Date(posicion.fecha_dispositivo);

      return (
        posicionUtilizable(posicion) &&
        diferencia >= 15000 &&
        diferencia <= 120000
      );
    });

  if (!anterior) {
    return noDisponible(
      'SIN_MOVIMIENTO_CONFIRMADO',
      'Se necesitan más posiciones recientes para estimar la llegada.',
      { objetivo },
    );
  }

  const antes = proyectar(anterior);

  if (
    antes.ambigua ||
    antes.distancia > 100
  ) {
    return noDisponible(
      'POSICION_AMBIGUA',
      'No se pudo confirmar el avance del vehículo sobre la ruta.',
      { objetivo },
    );
  }

  const avance =
    camion.avance - antes.avance;

  const segundos = (
    new Date(actual.fecha_dispositivo) -
    new Date(anterior.fecha_dispositivo)
  ) / 1000;

  const avanceMinimo = Math.max(
    15,
    numero(actual.precision_gps) +
    numero(anterior.precision_gps),
  );

  if (avance < avanceMinimo) {
    return noDisponible(
      'SIN_MOVIMIENTO_CONFIRMADO',
      'No se detecta avance suficiente hacia el punto; la estimación se actualizará con nuevas posiciones.',
      { objetivo },
    );
  }

  // Descartar saltos GPS incompatibles con este cálculo.
  if (
    avance / segundos > 80 / 3.6
  ) {
    return noDisponible(
      'MOVIMIENTO_INCONSISTENTE',
      'El cambio de ubicación no permite una estimación confiable.',
      { objetivo },
    );
  }

  // ------------------------------------------------------
  // 5. Contar paradas pendientes antes del destino
  // ------------------------------------------------------

  let paradasPendientes = 0;

  for (const punto of puntos) {
    if (
      punto.estado_atencion !== 'PENDIENTE' ||
      !coordenada(punto)
    ) {
      continue;
    }

    const posicion = proyectar(punto);

    if (
      posicion.ambigua ||
      posicion.distancia > 50
    ) {
      return noDisponible(
        'PARADAS_NO_LOCALIZABLES',
        'No se pueden ubicar todas las paradas pendientes sobre la ruta.',
        { objetivo },
      );
    }

    if (
      posicion.avance >= camion.avance - 15 &&
      posicion.avance < meta.avance - 5
    ) {
      paradasPendientes++;
    }
  }

  // ------------------------------------------------------
  // 6. Calcular minutos e intervalo orientativo
  // ------------------------------------------------------

  const velocidad = opcion(
    config.velocidadKmh,
    8,
    3,
    30,
  );

  const minutosParada = opcion(
    config.paradaMin,
    1,
    0,
    15,
  );

  const minutos =
    distanciaRestante /
    (velocidad * 1000 / 60) +
    paradasPendientes * minutosParada;

  const minimo = Math.max(
    1,
    Math.floor(minutos * 0.7),
  );

  const maximo = Math.max(
    minimo + 1,
    Math.ceil(minutos * 1.5),
  );

  return {
    ...base,

    disponible: true,
    codigo: 'ESTIMADA',

    minutos: Math.ceil(minutos),
    minutos_min: minimo,
    minutos_max: maximo,

    mensaje:
      'Llegada aproximada al punto cercano ' +
      `en ${minimo}–${maximo} minutos.`,

    objetivo,

    distancia_restante_metros: Math.round(distanciaRestante),

    paradas_pendientes: paradasPendientes,

    metodo: 'DISTANCIA_EN_RUTA_Y_PARADAS_CONFIGURADAS',

    velocidad_referencia_kmh: velocidad,

    minutos_por_parada: minutosParada,

    // La pantalla debe dejar de mostrar esta estimación
    // si no recibe otra consulta antes del vencimiento.
    valida_hasta: new Date(
      Math.min(
        ahora.getTime() + 30000,

        new Date(
          actual.fecha_dispositivo,
        ).getTime() + 120000,
      ),
    ).toISOString(),
  };
};

module.exports = {
  calcularEta,
};