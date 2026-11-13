const {
  QueryTypes,
  Transaction,
} = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const LIMITES = {
  pdf: 1000,
  xlsx: 10000,
  csv: 50000,
};

// Relaciones comunes de un recorrido.
const enlaces = `
  JOIN programacion_rutas p
    ON p.id_programacion = r.id_programacion

  LEFT JOIN rutas rt
    ON rt.id_ruta = p.id_ruta

  LEFT JOIN zonas z
    ON z.id_zona = rt.id_zona

  LEFT JOIN vehiculos v
    ON v.id_vehiculo = p.id_vehiculo
`;

const identidad = `
  p.id_programacion,
  p.id_ruta,
  rt.nombre AS ruta,
  rt.id_zona,
  z.nombre AS zona,
  p.id_vehiculo,
  v.placa
`;

const unidad = `
  JSON_UNQUOTE(
    JSON_EXTRACT(
      r.resultado_final,
      '$.unidad_medida'
    )
  )
`;

const cantidad = `
  CASE
    WHEN ${unidad} IN ('KG', 'TONELADA', 'LITRO', 'M3')
    THEN CAST(
      JSON_UNQUOTE(
        JSON_EXTRACT(
          r.resultado_final,
          '$.cantidad_total'
        )
      ) AS DECIMAL(18, 3)
    )
    ELSE NULL
  END
`;

const comunes = {
  id_zona: 'rt.id_zona',
  id_ruta: 'p.id_ruta',
  id_vehiculo: 'p.id_vehiculo',
  id_programacion: 'p.id_programacion',
  turno: 'p.turno',
};

// ==========================================================
// ESTADO VIGENTE DE CADA PUNTO
// Solo expresiones SQL internas del servidor.
// ==========================================================

const decisionAtencionSql = `
  (
    SELECT c.resultado_atencion
    FROM recoleccion_puntos c
    WHERE c.id_recorrido = r.id_recorrido
      AND c.id_ruta_punto = pt.id_ruta_punto
      AND c.estado_recoleccion = 'REGISTRADA'
    ORDER BY c.id_recoleccion DESC
    LIMIT 1
  )
`;

const contarPuntosSql = (
  condicion = '1 = 1',
) => `
  (
    SELECT COUNT(*)
    FROM ruta_puntos pt
    WHERE pt.id_ruta_version = p.id_ruta_version
      AND pt.tipo_punto = 'RECOLECCION'
      AND pt.estado = 1
      AND pt.deleted_at IS NULL
      AND (${condicion})
  )
`;

const totalPuntosSql = contarPuntosSql();

const atendidosSql = contarPuntosSql(
  `${decisionAtencionSql} = 'ATENDIDO'`,
);

const omitidosSql = contarPuntosSql(
  `${decisionAtencionSql} = 'OMITIDO'`,
);

// Las expresiones SQL proceden exclusivamente de esta configuración.
// Los valores recibidos del cliente se envían como parámetros.
const configuraciones = {
  PROGRAMACIONES: {
    select: `
      ${identidad},
      p.fecha_programada,
      p.hora_inicio_programada,
      p.hora_fin_programada,
      p.turno,
      p.estado_programacion AS estado,
      p.id_usuario_creacion
    `,

    from: `
      programacion_rutas p

      LEFT JOIN rutas rt
        ON rt.id_ruta = p.id_ruta

      LEFT JOIN zonas z
        ON z.id_zona = rt.id_zona

      LEFT JOIN vehiculos v
        ON v.id_vehiculo = p.id_vehiculo
    `,

    where: 'p.deleted_at IS NULL',
    fecha: 'p.fecha_programada',
    civil: true,

    filtros: {
      ...comunes,
      estado: 'p.estado_programacion',
    },

    columnas: [
      'id_programacion',
      'id_ruta',
      'ruta',
      'id_zona',
      'zona',
      'id_vehiculo',
      'placa',
      'fecha_programada',
      'hora_inicio_programada',
      'hora_fin_programada',
      'turno',
      'estado',
      'id_usuario_creacion',
    ].join(','),

    orden: 'fecha_programada',
    base: 'Fecha programada',
  },

  RECORRIDOS: {
    select: `
      r.id_recorrido,
      ${identidad},
      r.estado_recorrido AS estado,
      r.fecha_hora_inicio AS fecha_inicio,
      r.fecha_hora_finalizacion AS fecha_fin,
      r.duracion_segundos,
      r.distancia_recorrida_metros,
      r.id_usuario_inicio,
      r.id_usuario_finalizacion,

      (
        SELECT COUNT(*)
        FROM ruta_puntos pt
        WHERE pt.id_ruta_version = p.id_ruta_version
          AND pt.tipo_punto = 'RECOLECCION'
          AND pt.estado = 1
          AND pt.deleted_at IS NULL
      ) AS puntos_total,

      (
        SELECT COUNT(DISTINCT c.id_ruta_punto)
        FROM recoleccion_puntos c

        JOIN ruta_puntos pt
          ON pt.id_ruta_punto = c.id_ruta_punto

        WHERE c.id_recorrido = r.id_recorrido
          AND c.estado_recoleccion = 'REGISTRADA'
          AND pt.id_ruta_version = p.id_ruta_version
          AND pt.tipo_punto = 'RECOLECCION'
          AND pt.estado = 1
          AND pt.deleted_at IS NULL
      ) AS puntos_atendidos
    `,

    from: `recorridos r ${enlaces}`,
    where: 'r.deleted_at IS NULL',
    fecha: 'r.fecha_hora_inicio',

    filtros: {
      ...comunes,
      id_recorrido: 'r.id_recorrido',
      estado: 'r.estado_recorrido',
      id_usuario: 'r.id_usuario_inicio',
    },

    columnas: [
      'id_recorrido',
      'id_programacion',
      'id_ruta',
      'ruta',
      'id_zona',
      'zona',
      'id_vehiculo',
      'placa',
      'estado',
      'fecha_inicio',
      'fecha_fin',
      'duracion_segundos',
      'distancia_recorrida_metros',
      'id_usuario_inicio',
      'id_usuario_finalizacion',
      'puntos_total',
      'puntos_atendidos',
    ].join(','),

    // RECORRIDOS: {
    //   select: `
    //     r.id_recorrido,
    //     ${identidad},
    //     r.estado_recorrido AS estado,
    //     r.fecha_hora_inicio AS fecha_inicio,
    //     r.fecha_hora_finalizacion AS fecha_fin,
    //     r.duracion_segundos,
    //     r.distancia_recorrida_metros,
    //     r.id_usuario_inicio,
    //     r.id_usuario_finalizacion,

    //     (
    //       SELECT COUNT(*)
    //       FROM ruta_puntos pt
    //       WHERE pt.id_ruta_version = p.id_ruta_version
    //         AND pt.tipo_punto = 'RECOLECCION'
    //         AND pt.estado = 1
    //         AND pt.deleted_at IS NULL
    //     ) AS puntos_total,

    //     (
    //       SELECT COUNT(DISTINCT c.id_ruta_punto)
    //       FROM recoleccion_puntos c

    //       JOIN ruta_puntos pt
    //         ON pt.id_ruta_punto = c.id_ruta_punto

    //       WHERE c.id_recorrido = r.id_recorrido
    //         AND c.estado_recoleccion = 'REGISTRADA'
    //         AND pt.id_ruta_version = p.id_ruta_version
    //         AND pt.tipo_punto = 'RECOLECCION'
    //         AND pt.estado = 1
    //         AND pt.deleted_at IS NULL
    //     ) AS puntos_atendidos
    //   `,

    //   from: `recorridos r ${enlaces}`,
    //   where: 'r.deleted_at IS NULL',
    //   fecha: 'r.fecha_hora_inicio',

    //   filtros: {
    //     ...comunes,
    //     id_recorrido: 'r.id_recorrido',
    //     estado: 'r.estado_recorrido',
    //     id_usuario: 'r.id_usuario_inicio',
    //   },

    //   columnas: [
    //     'id_recorrido',
    //     'id_programacion',
    //     'id_ruta',
    //     'ruta',
    //     'id_zona',
    //     'zona',
    //     'id_vehiculo',
    //     'placa',
    //     'estado',
    //     'fecha_inicio',
    //     'fecha_fin',
    //     'duracion_segundos',
    //     'distancia_recorrida_metros',
    //     'id_usuario_inicio',
    //     'id_usuario_finalizacion',
    //     'puntos_total',
    //     'puntos_atendidos',
    //   ].join(','),

    orden: 'fecha_inicio',
    base: 'Inicio real del recorrido',
  },

  // Una fila por recorrido finalizado.
  RECOLECCIONES: {
    select: `
      r.id_recorrido,
      ${identidad},
      r.estado_recorrido AS estado,
      r.fecha_hora_finalizacion AS fecha_fin,
      ${cantidad} AS cantidad_total,
      ${unidad} AS unidad_medida,

      JSON_UNQUOTE(
        JSON_EXTRACT(
          r.resultado_final,
          '$.id_usuario'
        )
      ) AS id_usuario_registro,

      JSON_UNQUOTE(
        JSON_EXTRACT(
          r.resultado_final,
          '$.fecha_dispositivo'
        )
      ) AS fecha_medicion,

      CASE
        WHEN r.resultado_final IS NULL THEN 1
        ELSE 0
      END AS resultado_pendiente
    `,

    from: `recorridos r ${enlaces}`,

    where: `
      r.deleted_at IS NULL
      AND r.estado_recorrido = 'FINALIZADO'
    `,

    fecha: 'r.fecha_hora_finalizacion',

    filtros: {
      ...comunes,

      id_recorrido: 'r.id_recorrido',

      unidad_medida: unidad,

      id_usuario: `
        JSON_UNQUOTE(
          JSON_EXTRACT(
            r.resultado_final,
            '$.id_usuario'
          )
        )
      `,
    },

    columnas: [
      'id_recorrido',
      'id_programacion',
      'id_ruta',
      'ruta',
      'id_zona',
      'zona',
      'id_vehiculo',
      'placa',
      'estado',
      'fecha_fin',
      'cantidad_total',
      'unidad_medida',
      'id_usuario_registro',
      'fecha_medicion',
      'resultado_pendiente',
    ].join(','),

    orden: 'fecha_fin',
    base: 'Finalización real; cantidad final por recorrido',
  },

  INCIDENCIAS: {
    select: `
      i.id_incidencia,
      i.id_recorrido,
      i.fecha_reporte,
      i.fecha_resolucion,
      i.tipo,
      i.prioridad,
      i.estado_incidencia AS estado,
      i.titulo,
      i.origen,
      i.id_usuario_reporte,
      i.id_responsable,

      COALESCE(i.id_ruta, p.id_ruta) AS id_ruta,
      rt.nombre AS ruta,

      COALESCE(i.id_zona, rt.id_zona) AS id_zona,
      z.nombre AS zona,

      p.id_vehiculo,
      v.placa
    `,

    from: `
      incidencias i

      LEFT JOIN recorridos r
        ON r.id_recorrido = i.id_recorrido

      LEFT JOIN programacion_rutas p
        ON p.id_programacion = r.id_programacion

      LEFT JOIN rutas rt
        ON rt.id_ruta = COALESCE(i.id_ruta, p.id_ruta)

      LEFT JOIN zonas z
        ON z.id_zona = COALESCE(i.id_zona, rt.id_zona)

      LEFT JOIN vehiculos v
        ON v.id_vehiculo = p.id_vehiculo
    `,

    where: 'i.deleted_at IS NULL',
    fecha: 'i.fecha_reporte',

    filtros: {
      turno: 'p.turno',
      id_zona: 'COALESCE(i.id_zona, rt.id_zona)',
      id_ruta: 'COALESCE(i.id_ruta, p.id_ruta)',
      id_vehiculo: 'p.id_vehiculo',
      id_recorrido: 'i.id_recorrido',
      id_incidencia: 'i.id_incidencia',
      id_usuario: 'i.id_usuario_reporte',
      id_responsable: 'i.id_responsable',
      estado: 'i.estado_incidencia',
      tipo: 'i.tipo',
      prioridad: 'i.prioridad',
      origen: 'i.origen',
    },

    columnas: [
      'id_incidencia',
      'id_recorrido',
      'fecha_reporte',
      'fecha_resolucion',
      'tipo',
      'prioridad',
      'estado',
      'titulo',
      'origen',
      'id_usuario_reporte',
      'id_responsable',
      'id_ruta',
      'ruta',
      'id_zona',
      'zona',
      'id_vehiculo',
      'placa',
    ].join(','),

    orden: 'fecha_reporte',
    base: 'Fecha de reporte de la incidencia',
  },

  VEHICULOS: {
    select: `
      p.id_vehiculo,
      v.placa,
      v.estado_operativo AS estado,
      COUNT(*) AS recorridos,

      SUM(
        r.estado_recorrido = 'FINALIZADO'
      ) AS finalizados,

      SUM(
        r.duracion_segundos
      ) AS duracion_segundos,

      SUM(
        r.distancia_recorrida_metros
      ) AS distancia_recorrida_metros
    `,

    from: `recorridos r ${enlaces}`,
    where: 'r.deleted_at IS NULL',
    fecha: 'r.fecha_hora_inicio',

    filtros: {
      ...comunes,
      estado: 'v.estado_operativo',
    },

    group: `
      p.id_vehiculo,
      v.placa,
      v.estado_operativo
    `,

    columnas: [
      'id_vehiculo',
      'placa',
      'estado',
      'recorridos',
      'finalizados',
      'duracion_segundos',
      'distancia_recorrida_metros',
    ].join(','),

    orden: 'placa',

    base:
      'Vehículos con recorridos iniciados en el período; ' +
      'estado actual del vehículo',
  },

  MANTENIMIENTOS: {
    select: `
      m.id_mantenimiento,
      m.id_vehiculo,
      v.placa,
      m.tipo_mantenimiento,
      m.estado_mantenimiento AS estado,
      m.fecha_inicio_programada,
      m.fecha_fin_programada,
      m.fecha_inicio_real,
      m.fecha_fin_real,
      m.costo_total,
      m.vehiculo_operativo
    `,

    from: `
      vehiculo_mantenimientos m

      LEFT JOIN vehiculos v
        ON v.id_vehiculo = m.id_vehiculo
    `,

    where: '1 = 1',
    fecha: 'm.fecha_inicio_programada',

    filtros: {
      id_vehiculo: 'm.id_vehiculo',
      id_mantenimiento: 'm.id_mantenimiento',
      tipo_mantenimiento: 'm.tipo_mantenimiento',
      estado: 'm.estado_mantenimiento',
    },

    columnas: [
      'id_mantenimiento',
      'id_vehiculo',
      'placa',
      'tipo_mantenimiento',
      'estado',
      'fecha_inicio_programada',
      'fecha_fin_programada',
      'fecha_inicio_real',
      'fecha_fin_real',
      'costo_total',
      'vehiculo_operativo',
    ].join(','),

    orden: 'fecha_inicio_programada',
    base: 'Inicio programado del mantenimiento',
  },
};

const estadoAtencionSql = `
  CASE
    WHEN c.id_recoleccion IS NULL
      THEN 'PENDIENTE'
    ELSE c.resultado_atencion
  END
`;

configuraciones.ATENCION_PUNTOS = {
  select: `
    r.id_recorrido,
    ${identidad},

    pt.id_ruta_punto,
    pt.nombre AS punto,
    pt.orden,
    pt.obligatorio,

    ${estadoAtencionSql} AS estado,

    c.id_recoleccion,
    c.id_usuario,
    u.username AS responsable,

    c.fecha_dispositivo,
    c.fecha_recepcion,

    c.latitud,
    c.longitud,
    c.precision_gps,
    c.distancia_punto_metros,
    c.dentro_radio_permitido,

    c.motivo_omision,
    c.observacion
  `,

  from: `
    recorridos r
    ${enlaces}

    JOIN ruta_puntos pt
      ON pt.id_ruta_version = p.id_ruta_version

    LEFT JOIN recoleccion_puntos c
      ON c.id_recoleccion = (
        SELECT MAX(c2.id_recoleccion)
        FROM recoleccion_puntos c2

        WHERE c2.id_recorrido = r.id_recorrido
          AND c2.id_ruta_punto = pt.id_ruta_punto
          AND c2.estado_recoleccion = 'REGISTRADA'
      )

    LEFT JOIN usuarios u
      ON u.id_usuario = c.id_usuario
  `,

  where: `
    r.deleted_at IS NULL
    AND pt.deleted_at IS NULL
    AND pt.estado = 1
    AND pt.tipo_punto = 'RECOLECCION'
  `,

  fecha: 'r.fecha_hora_inicio',

  base:
    'Inicio del recorrido; incluye puntos pendientes ' +
    'sin fecha de decisión',

  filtros: {
    ...comunes,

    id_recorrido: 'r.id_recorrido',
    id_punto: 'pt.id_ruta_punto',
    id_usuario: 'c.id_usuario',

    estado: estadoAtencionSql,
  },

  columnas: [
    'id_recorrido',
    'id_programacion',
    'id_ruta',
    'ruta',
    'id_zona',
    'zona',
    'id_vehiculo',
    'placa',
    'id_ruta_punto',
    'punto',
    'orden',
    'obligatorio',
    'estado',
    'id_recoleccion',
    'id_usuario',
    'responsable',
    'fecha_dispositivo',
    'fecha_recepcion',
    'latitud',
    'longitud',
    'precision_gps',
    'distancia_punto_metros',
    'dentro_radio_permitido',
    'motivo_omision',
    'observacion',
  ].join(','),

  orden: 'id_recorrido',
};

// configuraciones.ATENCION_PUNTOS = {
//   select: `
//     r.id_recorrido,
//     ${identidad},
//     pt.id_ruta_punto,
//     pt.nombre AS punto,
//     pt.orden,
//     pt.obligatorio,

//     CASE
//       WHEN c.id_recoleccion IS NULL THEN 'PENDIENTE'
//       ELSE 'ATENDIDO'
//     END AS estado,

//     c.id_recoleccion,
//     c.id_usuario,
//     c.fecha_dispositivo,
//     c.fecha_recepcion,
//     c.latitud,
//     c.longitud,
//     c.observacion
//   `,

//   from: `
//     recorridos r
//     ${enlaces}

//     JOIN ruta_puntos pt
//       ON pt.id_ruta_version = p.id_ruta_version

//     LEFT JOIN recoleccion_puntos c
//       ON c.id_recoleccion = (
//         SELECT MAX(c2.id_recoleccion)
//         FROM recoleccion_puntos c2
//         WHERE c2.id_recorrido = r.id_recorrido
//           AND c2.id_ruta_punto = pt.id_ruta_punto
//           AND c2.estado_recoleccion = 'REGISTRADA'
//       )
//   `,

//   where: `
//     r.deleted_at IS NULL
//     AND pt.deleted_at IS NULL
//     AND pt.estado = 1
//     AND pt.tipo_punto = 'RECOLECCION'
//   `,

//   fecha: 'r.fecha_hora_inicio',

//   base:
//     'Inicio del recorrido; incluye puntos pendientes ' +
//     'sin fecha de atención',

//   filtros: {
//     ...comunes,

//     id_recorrido: 'r.id_recorrido',
//     id_punto: 'pt.id_ruta_punto',
//     id_usuario: 'c.id_usuario',

//     estado: `
//       CASE
//         WHEN c.id_recoleccion IS NULL THEN 'PENDIENTE'
//         ELSE 'ATENDIDO'
//       END
//     `,
//   },

//   columnas: [
//     'id_recorrido',
//     'id_programacion',
//     'id_ruta',
//     'ruta',
//     'id_zona',
//     'zona',
//     'id_vehiculo',
//     'placa',
//     'id_ruta_punto',
//     'punto',
//     'orden',
//     'obligatorio',
//     'estado',
//     'id_recoleccion',
//     'id_usuario',
//     'fecha_dispositivo',
//     'fecha_recepcion',
//     'latitud',
//     'longitud',
//     'observacion',
//   ].join(','),

//   orden: 'id_recorrido',
// };

configuraciones.REPORTES_CIUDADANOS = {
  ...configuraciones.INCIDENCIAS,

  where: `
    i.deleted_at IS NULL
    AND i.origen IN ('APP_CIUDADANA', 'WEB_CIUDADANA')
  `,
};

const estados = {
  PROGRAMACIONES: [
    'PROGRAMADA',
    'ASIGNADA',
    'ACEPTADA',
    'EN_CURSO',
    'PAUSADA',
    'FINALIZADA',
    'CANCELADA',
  ],

  RECORRIDOS: [
    'EN_CURSO',
    'PAUSADO',
    'FINALIZADO',
    'CANCELADO',
  ],

  INCIDENCIAS: [
    'REPORTADA',
    'EN_REVISION',
    'EN_ATENCION',
    'RESUELTA',
    'RECHAZADA',
    'CANCELADA',
  ],

  VEHICULOS: [
    'DISPONIBLE',
    'ASIGNADO',
    'EN_RUTA',
    'EN_MANTENIMIENTO',
    'FUERA_DE_SERVICIO',
  ],

  ATENCION_PUNTOS: [
    'ATENDIDO',
    'OMITIDO',
    'PENDIENTE',
  ],

  MANTENIMIENTOS: [
    'PROGRAMADO',
    'EN_PROCESO',
    'FINALIZADO',
    'CANCELADO',
  ],
};

estados.REPORTES_CIUDADANOS = estados.INCIDENCIAS;

const opciones = {
  unidad_medida: [
    'KG',
    'TONELADA',
    'LITRO',
    'M3',
  ],

  tipo_mantenimiento: [
    'PREVENTIVO',
    'CORRECTIVO',
  ],

  prioridad: [
    'BAJA',
    'MEDIA',
    'ALTA',
    'CRITICA',
  ],

  origen: [
    'APP_OPERATIVA',
    'APP_CIUDADANA',
    'WEB_MUNICIPAL',
    'WEB_CIUDADANA',
  ],

  tipo: [
    'VIA_BLOQUEADA',
    'AVERIA_VEHICULO',
    'ACCIDENTE',
    'RECOLECCION_NO_REALIZADA',
    'ACUMULACION_RESIDUOS',
    'PUNTO_INACCESIBLE',
    'OTRO',
  ],
};

const rechazar = (
  mensaje,
  codigo = 'INVALID_REPORT_FILTER',
) => {
  throw new AppError(mensaje, 400, codigo);
};

const autorizar = usuario => {
  const id = Number(
    usuario?.id_usuario ??
    usuario?.idUsuario ??
    usuario?.id,
  );

  const roles = (
    Array.isArray(usuario?.roles)
      ? usuario.roles
      : []
  ).map(rol =>
    String(
      typeof rol === 'string'
        ? rol
        : rol.nombre,
    )
      .trim()
      .toUpperCase(),
  );

  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !roles.some(rol =>
      ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR']
        .includes(rol),
    )
  ) {
    throw new AppError(
      'No tienes permiso para consultar o exportar reportes.',
      403,
      'REPORT_FORBIDDEN',
    );
  }

  return id;
};

const fechaCivil = valor => {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    rechazar('Usa fechas YYYY-MM-DD.');
  }

  const numero = Date.parse(
    `${valor}T00:00:00Z`,
  );

  if (
    !Number.isFinite(numero) ||
    new Date(numero).toISOString().slice(0, 10) !== valor
  ) {
    rechazar('La fecha no existe.');
  }

  return numero;
};

const normalizar = (
  tipo,
  query = {},
) => {
  const configuracion =
    Object.hasOwn(configuraciones, tipo)
      ? configuraciones[tipo]
      : null;

  if (!configuracion) {
    rechazar(
      'Tipo de reporte no implementado.',
      'INVALID_REPORT_TYPE',
    );
  }

  if (
    !query ||
    typeof query !== 'object' ||
    Array.isArray(query)
  ) {
    rechazar('Filtros no válidos.');
  }

  const admitidos = new Set([
    'fecha_inicio',
    'fecha_fin',
    'page',
    'limit',
    'sort_by',
    'sort_order',
    ...Object.keys(configuracion.filtros),
  ]);

  for (const [campo, valor] of Object.entries(query)) {
    if (!admitidos.has(campo)) {
      rechazar(
        `El filtro ${campo} no aplica a ${tipo}.`,
      );
    }

    if (
      !['string', 'number'].includes(typeof valor)
    ) {
      rechazar(
        `El filtro ${campo} debe ser un valor simple.`,
      );
    }
  }

  const inicio = fechaCivil(query.fecha_inicio);
  const fin = fechaCivil(query.fecha_fin);

  const dias = (fin - inicio) / 86400000 + 1;

  if (dias < 1 || dias > 366) {
    rechazar(
      'El período debe comprender entre 1 y 366 días.',
    );
  }

  const entero = (
    valor,
    predeterminado,
    maximo,
  ) => {
    const entrada =
      valor === undefined
        ? predeterminado
        : valor;

    const numero = Number(entrada);

    if (
      !/^\d+$/.test(String(entrada)) ||
      !Number.isSafeInteger(numero) ||
      numero < 1 ||
      numero > maximo
    ) {
      rechazar(
        'Identificador o paginación no válidos.',
      );
    }

    return numero;
  };

  const filtros = {
    fecha_inicio: query.fecha_inicio,
    fecha_fin: query.fecha_fin,
  };

  for (
    const campo of Object.keys(configuracion.filtros)
  ) {
    if (query[campo] === undefined) continue;

    filtros[campo] = campo.startsWith('id_')
      ? entero(
        query[campo],
        null,
        Number.MAX_SAFE_INTEGER,
      )
      : String(query[campo]).trim().toUpperCase();

    if (
      !String(filtros[campo]).length ||
      String(filtros[campo]).length > 100
    ) {
      rechazar(`Filtro ${campo} no válido.`);
    }

    const permitidos =
      campo === 'estado'
        ? estados[tipo]
        : opciones[campo];

    if (
      permitidos &&
      !permitidos.includes(filtros[campo])
    ) {
      rechazar(
        `El valor de ${campo} no está permitido.`,
      );
    }
  }

  const sort_by =
    query.sort_by || configuracion.orden;

  const sort_order =
    String(query.sort_order || 'DESC')
      .toUpperCase();

  if (
    !configuracion.columnas
      .split(',')
      .includes(sort_by) ||
    !['ASC', 'DESC'].includes(sort_order)
  ) {
    rechazar('Ordenamiento no válido.');
  }

  return {
    c: configuracion,
    filtros,
    inicio,
    fin,

    page: entero(query.page, 1, 1000000),
    limit: entero(query.limit, 20, 100),

    sort_by,
    sort_order,
  };
};

const construir = (
  tipo,
  query,
) => {
  const normalizado = normalizar(tipo, query);
  const { c, filtros } = normalizado;

  const sqlDate = milisegundos =>
    new Date(milisegundos)
      .toISOString()
      .replace('T', ' ')
      .replace('Z', '');

  // Perú: UTC-5.
  // El día local comienza a las 05:00 UTC.
  const params = {
    inicio: c.civil
      ? filtros.fecha_inicio
      : sqlDate(normalizado.inicio + 18000000),

    fin: c.civil
      ? new Date(
        normalizado.fin + 86400000,
      ).toISOString().slice(0, 10)
      : sqlDate(
        normalizado.fin +
        86400000 +
        18000000,
      ),
  };

  const condiciones = [
    c.where,
    `${c.fecha} >= :inicio`,
    `${c.fecha} < :fin`,
  ];

  for (const [campo, columna] of Object.entries(c.filtros)) {
    if (filtros[campo] === undefined) continue;

    params[campo] = filtros[campo];

    condiciones.push(
      `${columna} = :${campo}`,
    );
  }

  return {
    ...normalizado,
    params,

    sql: `
      SELECT ${c.select}
      FROM ${c.from}
      WHERE ${condiciones.join(' AND ')}
      ${c.group ? `GROUP BY ${c.group}` : ''}
    `,
  };
};

const ejecutar = async (
  tipo,
  {
    query = {},
    usuario,
    transaction = null,
    formato = null,
    soloResumen = false,
  } = {},
) => {
  const generado_por = autorizar(usuario);

  const normalizado = construir(tipo, query);
  const { c, sql, params } = normalizado;

  if (
    formato !== null &&
    !Object.hasOwn(LIMITES, formato)
  ) {
    rechazar('Formato no válido.');
  }

  const leer = async tx => {
    const select = (
      texto,
      replacements = params,
    ) => db.sequelize.query(
      texto,
      {
        replacements,
        type: QueryTypes.SELECT,
        transaction: tx,
      },
    );

    const [conteo] = await select(`
      SELECT COUNT(*) AS total
      FROM (${sql}) datos
    `);

    const total = Number(conteo.total);

    if (!Number.isSafeInteger(total)) {
      throw new AppError(
        'El conteo supera el rango admitido.',
        422,
        'REPORT_COUNT_LIMIT',
      );
    }

    if (formato && total > LIMITES[formato]) {
      throw new AppError(
        `La exportación ${formato} admite hasta ` +
        `${LIMITES[formato]} filas. ` +
        'Reduce el período o agrega filtros.',
        422,
        'REPORT_EXPORT_LIMIT',
      );
    }

    const resumen = {
      total,

      por_estado: await select(`
        SELECT estado, COUNT(*) AS total
        FROM (${sql}) datos
        GROUP BY estado
      `),
    };

    if (tipo === 'RECOLECCIONES') {
      resumen.cantidades_por_unidad =
        await select(`
          SELECT
            unidad_medida,
            SUM(cantidad_total) AS cantidad_total,
            COUNT(*) AS recorridos
          FROM (${sql}) datos
          WHERE cantidad_total IS NOT NULL
          GROUP BY unidad_medida
          ORDER BY unidad_medida
        `);

      const [pendientes] = await select(`
        SELECT
          COALESCE(SUM(resultado_pendiente), 0) AS total
        FROM (${sql}) datos
      `);

      resumen.resultados_pendientes =
        Number(pendientes.total);
    }

    if (soloResumen) {
      return resumen;
    }

    const limite = formato
      ? LIMITES[formato]
      : normalizado.limit;

    const offset = formato
      ? 0
      : (
        normalizado.page - 1
      ) * normalizado.limit;

    const desempate =
      c.columnas.split(',')[0];

    const items = await select(
      `
        SELECT *
        FROM (${sql}) datos

        ORDER BY
          \`${normalizado.sort_by}\`
          ${normalizado.sort_order},
          \`${desempate}\` ASC

        LIMIT :limite
        OFFSET :offset
      `,
      {
        ...params,
        limite,
        offset,
      },
    );

    return {
      tipo_reporte: tipo,

      filtros_aplicados: normalizado.filtros,

      columnas: c.columnas
        .split(',')
        .map(key => ({
          key,
          titulo: key.replace(/_/g, ' '),
        })),

      items,
      resumen,

      pagination: formato
        ? null
        : {
          page: normalizado.page,
          limit: normalizado.limit,
          total,

          total_pages: Math.ceil(
            total / normalizado.limit,
          ),

          has_next_page:
            normalizado.page *
            normalizado.limit < total,

          has_previous_page:
            normalizado.page > 1 &&
            total > 0,
        },

      metadata: {
        zona_horaria: 'America/Lima',
        generado_por,

        orden: {
          sort_by: normalizado.sort_by,
          sort_order: normalizado.sort_order,
        },

        base_fecha: c.base,
        generado_en: new Date().toISOString(),

        alcance: formato
          ? 'TODOS_LOS_FILTRADOS'
          : 'PAGINA',
      },
    };
  };

  // Conteo, resumen y filas se leen en la misma transacción.
  return transaction
    ? leer(transaction)
    : db.sequelize.transaction(
      {
        isolationLevel:
          Transaction.ISOLATION_LEVELS
            .REPEATABLE_READ,
      },
      leer,
    );
};

module.exports = {
  ejecutar,
  autorizar,
  construir,
  LIMITES,
};