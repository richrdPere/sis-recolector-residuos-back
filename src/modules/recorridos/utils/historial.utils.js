'use strict';

const fechaMs = value =>
  value == null ? NaN : new Date(value).getTime();

// ==========================================================
// TIEMPOS A PARTIR DE LOS EVENTOS OPERATIVOS
// ==========================================================

const calcularTiempos = (
  recorrido,
  eventos,
  ahora = new Date(),
) => {
  const inicio = fechaMs(recorrido.fecha_hora_inicio);

  const fin = fechaMs(
    recorrido.fecha_hora_finalizacion ?? ahora,
  );

  const advertencias = [];

  if (
    !Number.isFinite(inicio) ||
    !Number.isFinite(fin) ||
    fin < inicio
  ) {
    return {
      total_segundos: null,
      pausa_segundos: null,
      operacion_segundos: null,
      pausas: [],
      advertencias: [
        'El período del recorrido no es válido.',
      ],
    };
  }

  let apertura = null;
  let pausaMs = 0;

  const pausas = [];

  const cerrarPausa = (
    hasta,
    abierta,
  ) => {
    const duracion = hasta - apertura;

    pausaMs += duracion;

    pausas.push({
      inicio: new Date(apertura).toISOString(),
      fin: new Date(hasta).toISOString(),

      duracion_segundos:
        Math.floor(duracion / 1000),

      abierta,
    });

    apertura = null;
  };

  const ordenados = [...eventos].sort(
    (a, b) =>
      fechaMs(a.fecha_evento) -
      fechaMs(b.fecha_evento) ||

      Number(a.id_recorrido_evento) -
      Number(b.id_recorrido_evento),
  );

  for (const evento of ordenados) {
    const instante = fechaMs(evento.fecha_evento);

    if (
      !Number.isFinite(instante) ||
      instante < inicio ||
      instante > fin
    ) {
      advertencias.push(
        'Existe un evento fuera del período del recorrido.',
      );

      continue;
    }

    if (evento.tipo_evento === 'PAUSA') {
      if (apertura !== null) {
        advertencias.push(
          'Existe una pausa repetida sin reanudación.',
        );
      } else {
        apertura = instante;
      }
    } else if (
      evento.tipo_evento === 'REANUDACION'
    ) {
      if (apertura === null) {
        advertencias.push(
          'Existe una reanudación sin pausa previa.',
        );
      } else {
        cerrarPausa(instante, false);
      }
    }
  }

  // Si terminó pausado, contar hasta su cierre.
  // Si todavía está activo, contar hasta la consulta.
  if (apertura !== null) {
    cerrarPausa(
      fin,
      recorrido.fecha_hora_finalizacion == null,
    );
  }

  const total = Math.floor(
    (fin - inicio) / 1000,
  );

  const pausa = Math.floor(
    pausaMs / 1000,
  );

  return {
    total_segundos: total,
    pausa_segundos: pausa,
    operacion_segundos: total - pausa,
    pausas,
    advertencias,
  };
};

// ==========================================================
// TRAZADO CON SEGMENTOS SEPARADOS
// ==========================================================

const construirTrazado = (
  recorrido,
  muestras,
) => {
  const features = [];

  let segmento = [];
  let anterior = null;

  let primera = null;
  let ultima = null;

  let validas = 0;
  let descartadas = 0;

  const inicio = fechaMs(
    recorrido.fecha_hora_inicio,
  );

  const fin =
    recorrido.fecha_hora_finalizacion == null
      ? Infinity
      : fechaMs(
        recorrido.fecha_hora_finalizacion,
      );

  const cortar = () => {
    if (segmento.length >= 2) {
      features.push({
        type: 'Feature',

        properties: {
          tipo: 'GPS',
        },

        geometry: {
          type: 'LineString',
          coordinates: segmento,
        },
      });
    } else if (segmento.length === 1) {
      features.push({
        type: 'Feature',

        properties: {
          tipo: 'GPS_AISLADO',
        },

        geometry: {
          type: 'Point',
          coordinates: segmento[0],
        },
      });
    }

    segmento = [];
    anterior = null;
  };

  for (const muestra of muestras) {
    const latitud =
      muestra.latitud == null
        ? NaN
        : Number(muestra.latitud);

    const longitud =
      muestra.longitud == null
        ? NaN
        : Number(muestra.longitud);

    const instante = fechaMs(
      muestra.fecha_dispositivo,
    );

    const valida = [
      true,
      1,
      '1',
    ].includes(muestra.es_valida);

    const simulada = [
      true,
      1,
      '1',
    ].includes(
      muestra.es_ubicacion_simulada,
    );

    if (
      !valida ||
      simulada ||
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      latitud < -90 ||
      latitud > 90 ||
      longitud < -180 ||
      longitud > 180 ||
      !Number.isFinite(instante) ||
      !Number.isFinite(inicio) ||
      Number.isNaN(fin) ||
      instante < inicio ||
      instante > fin
    ) {
      descartadas++;
      cortar();
      continue;
    }

    // No unir muestras separadas por más de dos minutos,
    // ni muestras con el mismo instante.
    if (
      anterior !== null &&
      (
        instante <= anterior ||
        instante - anterior > 120000
      )
    ) {
      cortar();
    }

    const coordenada = [
      longitud,
      latitud,
    ];

    if (!primera) {
      primera = coordenada;
    }

    ultima = coordenada;

    segmento.push(coordenada);
    anterior = instante;
    validas++;
  }

  cortar();

  for (
    const [tipo, coordenada] of [
      ['PRIMER_GPS', primera],
      ['ULTIMO_GPS', ultima],
    ]
  ) {
    if (!coordenada) continue;

    features.push({
      type: 'Feature',
      properties: { tipo },

      geometry: {
        type: 'Point',
        coordinates: coordenada,
      },
    });
  }

  return {
    geojson: {
      type: 'FeatureCollection',
      features,
    },

    total_en_servidor: muestras.length,
    muestras_cargadas: muestras.length,
    muestras_validas: validas,
    muestras_descartadas: descartadas,

    corte_por_hueco_segundos: 120,

    sincronizacion_dispositivos_verificada: false,
  };
};

module.exports = {
  calcularTiempos,
  construirTrazado,
};