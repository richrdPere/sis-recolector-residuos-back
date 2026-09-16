const {
  Op,
} = require('sequelize');

/*
|--------------------------------------------------------------------------
| Modelos
|--------------------------------------------------------------------------
|
| Ajusta únicamente esta ruta si tus modelos se exportan desde otro index.
|
*/

const {
  ProgramacionRuta,
  Ruta,
  Zona,
  RutaVersion,
  Vehiculo,
  ProgramacionPersonal,
  Personal,
  Recorrido,
} = require('../../models');

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const {
  TIPOS_REPORTE,
} = require(
  '../constants/reporte.constants',
);

/*
|--------------------------------------------------------------------------
| Validaciones
|--------------------------------------------------------------------------
*/

const {
  validarConsultaReporte,
} = require(
  '../validations/reporte.validation',
);

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const {
  normalizarFiltrosReporte,
  construirPaginacionRespuesta,
  obtenerFiltrosAplicados,
} = require('../utils');

/*
|--------------------------------------------------------------------------
| Estados
|--------------------------------------------------------------------------
*/

const ESTADOS_PROGRAMACION = Object.freeze([
  'PROGRAMADA',
  'ASIGNADA',
  'ACEPTADA',
  'EN_CURSO',
  'PAUSADA',
  'FINALIZADA',
  'CANCELADA',
]);

/*
|--------------------------------------------------------------------------
| Helpers internos
|--------------------------------------------------------------------------
*/

const tieneValor = (valor) => {
  return !(
    valor === undefined
    || valor === null
    || valor === ''
  );
};

/**
 * Evita que Sequelize reciba un nombre de columna arbitrario.
 */
const obtenerOrdenProgramaciones = ({
  sort_by,
  sort_order,
}) => {
  const camposPermitidos = new Set([
    'id_programacion',
    'fecha_programada',
    'hora_inicio_programada',
    'hora_fin_programada',
    'turno',
    'estado_programacion',
    'created_at',
  ]);

  const campo = camposPermitidos.has(sort_by)
    ? sort_by
    : 'fecha_programada';

  const direccion =
    String(sort_order).toUpperCase() === 'ASC'
      ? 'ASC'
      : 'DESC';

  /*
  | Cuando el orden principal es la fecha, se agrega también la hora.
  */

  if (campo === 'fecha_programada') {
    return [
      ['fecha_programada', direccion],
      ['hora_inicio_programada', direccion],
      ['id_programacion', direccion],
    ];
  }

  return [
    [campo, direccion],
    ['id_programacion', direccion],
  ];
};

/**
 * Convierte segundos a un formato comprensible.
 */
const formatearDuracion = (segundos) => {
  const totalSegundos = Number(segundos);

  if (
    !Number.isFinite(totalSegundos)
    || totalSegundos < 0
  ) {
    return null;
  }

  const horas = Math.floor(
    totalSegundos / 3600,
  );

  const minutos = Math.floor(
    (totalSegundos % 3600) / 60,
  );

  const segundosRestantes =
    totalSegundos % 60;

  return [
    String(horas).padStart(2, '0'),
    String(minutos).padStart(2, '0'),
    String(segundosRestantes).padStart(2, '0'),
  ].join(':');
};

/**
 * Obtiene el nombre completo de una persona.
 *
 * Ajusta estos campos si tu modelo Personal relaciona Persona
 * mediante otro alias.
 */
const obtenerNombrePersonal = (
  personalAsignado,
) => {
  const personal =
    personalAsignado?.personal;

  if (!personal) {
    return null;
  }

  /*
  | Si Personal contiene directamente los nombres.
  */

  const nombresDirectos = [
    personal.nombres,
    personal.apellido_paterno,
    personal.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (nombresDirectos) {
    return nombresDirectos;
  }

  /*
  | Si Personal se relaciona con Persona usando el alias persona.
  */

  const persona = personal.persona;

  if (persona) {
    return [
      persona.nombres,
      persona.apellido_paterno,
      persona.apellido_materno,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || null;
  }

  return (
    personal.nombre_completo
    || null
  );
};

/**
 * Calcula el tiempo programado en minutos.
 */
const calcularDuracionProgramadaMinutos = ({
  hora_inicio_programada,
  hora_fin_programada,
}) => {
  if (
    !hora_inicio_programada
    || !hora_fin_programada
  ) {
    return null;
  }

  const convertirMinutos = (hora) => {
    const [
      horas = 0,
      minutos = 0,
      segundos = 0,
    ] = String(hora)
      .split(':')
      .map(Number);

    return (
      horas * 60
      + minutos
      + segundos / 60
    );
  };

  const inicio = convertirMinutos(
    hora_inicio_programada,
  );

  const fin = convertirMinutos(
    hora_fin_programada,
  );

  if (fin <= inicio) {
    return null;
  }

  return Math.round(fin - inicio);
};

/*
|--------------------------------------------------------------------------
| Construcción de filtros
|--------------------------------------------------------------------------
*/

const construirWhereProgramaciones = (
  filtros,
) => {
  const where = {};

  /*
  |--------------------------------------------------------------------------
  | Fechas
  |--------------------------------------------------------------------------
  |
  | fecha_programada es DATEONLY, por lo que se pueden comparar cadenas
  | YYYY-MM-DD sin convertirlas a DATETIME.
  |
  */

  if (
    filtros.fecha_inicio
    && filtros.fecha_fin
  ) {
    where.fecha_programada = {
      [Op.between]: [
        filtros.fecha_inicio,
        filtros.fecha_fin,
      ],
    };
  } else if (filtros.fecha_inicio) {
    where.fecha_programada = {
      [Op.gte]:
        filtros.fecha_inicio,
    };
  } else if (filtros.fecha_fin) {
    where.fecha_programada = {
      [Op.lte]:
        filtros.fecha_fin,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Filtros directos
  |--------------------------------------------------------------------------
  */

  if (filtros.id_programacion) {
    where.id_programacion =
      filtros.id_programacion;
  }

  if (filtros.id_ruta) {
    where.id_ruta =
      filtros.id_ruta;
  }

  if (filtros.id_vehiculo) {
    where.id_vehiculo =
      filtros.id_vehiculo;
  }

  if (filtros.turno) {
    where.turno =
      filtros.turno;
  }

  if (filtros.estado) {
    where.estado_programacion =
      filtros.estado;
  }

  /*
  |--------------------------------------------------------------------------
  | Zona
  |--------------------------------------------------------------------------
  |
  | id_zona pertenece a Ruta.
  |
  */

  if (filtros.id_zona) {
    where['$ruta.id_zona$'] =
      filtros.id_zona;
  }

  /*
  |--------------------------------------------------------------------------
  | Personal
  |--------------------------------------------------------------------------
  |
  | id_personal pertenece a ProgramacionPersonal.
  |
  */

  if (filtros.id_personal) {
    where[
      '$personal_asignado.id_personal$'
    ] = filtros.id_personal;
  }

  /*
  |--------------------------------------------------------------------------
  | Conductor
  |--------------------------------------------------------------------------
  |
  | Aquí se asume que ProgramacionPersonal posee:
  |
  | - id_personal
  | - tipo_personal
  |
  | Si tu campo se llama rol, funcion o tipo_asignacion,
  | reemplaza tipo_personal.
  |
  */

  if (filtros.id_conductor) {
    where[
      '$personal_asignado.id_personal$'
    ] = filtros.id_conductor;

    where[
      '$personal_asignado.tipo_personal$'
    ] = 'CONDUCTOR';
  }

  /*
  |--------------------------------------------------------------------------
  | Búsqueda general
  |--------------------------------------------------------------------------
  |
  | Ajusta codigo_ruta y nombre_ruta si en tu modelo tienen otro nombre.
  |
  */

  if (filtros.search) {
    const patron =
      `%${filtros.search}%`;

    const condicionesBusqueda = [
      {
        '$ruta.codigo_ruta$': {
          [Op.like]: patron,
        },
      },
      {
        '$ruta.nombre_ruta$': {
          [Op.like]: patron,
        },
      },
      {
        '$vehiculo.placa$': {
          [Op.like]: patron,
        },
      },
    ];

    const idBuscado =
      Number(filtros.search);

    if (
      Number.isInteger(idBuscado)
      && idBuscado > 0
    ) {
      condicionesBusqueda.push({
        id_programacion:
          idBuscado,
      });
    }

    where[Op.or] =
      condicionesBusqueda;
  }

  return where;
};

/*
|--------------------------------------------------------------------------
| Includes compartidos
|--------------------------------------------------------------------------
*/

const construirIncludesProgramacion = ({
  incluirPersonal = true,
  incluirRecorrido = true,
} = {}) => {
  const includes = [
    {
      model: Ruta,
      as: 'ruta',
      required: false,

      include: [
        {
          model: Zona,
          as: 'zona',
          required: false,
        },
      ],
    },

    {
      model: RutaVersion,
      as: 'version_ruta',
      required: false,

      attributes: [
        'id_ruta_version',
        'numero_version',
      ],
    },

    {
      model: Vehiculo,
      as: 'vehiculo',
      required: false,
    },
  ];

  if (incluirPersonal) {
    includes.push({
      model: ProgramacionPersonal,
      as: 'personal_asignado',
      required: false,

      include: [
        {
          model: Personal,
          as: 'personal',
          required: false,

          /*
          | Si Personal pertenece a Persona, puedes agregar:
          |
          | include: [
          |   {
          |     model: Persona,
          |     as: 'persona',
          |     required: false,
          |   },
          | ],
          */
        },
      ],
    });
  }

  if (incluirRecorrido) {
    includes.push({
      model: Recorrido,
      as: 'recorrido',
      required: false,

      attributes: [
        'id_recorrido',
        'estado_recorrido',
        'fecha_hora_inicio',
        'fecha_hora_finalizacion',
        'duracion_segundos',
        'distancia_recorrida_metros',
      ],
    });
  }

  return includes;
};

/*
|--------------------------------------------------------------------------
| Transformación de una programación
|--------------------------------------------------------------------------
*/

const transformarProgramacion = (
  programacion,
) => {
  const item = programacion.get
    ? programacion.get({
      plain: true,
    })
    : programacion;

  const personalAsignado =
    item.personal_asignado || [];

  const conductor =
    personalAsignado.find(
      (asignacion) => {
        return asignacion.tipo_personal
          === 'CONDUCTOR';
      },
    );

  const recolectores =
    personalAsignado.filter(
      (asignacion) => {
        return asignacion.tipo_personal
          === 'RECOLECTOR';
      },
    );

  const supervisores =
    personalAsignado.filter(
      (asignacion) => {
        return asignacion.tipo_personal
          === 'SUPERVISOR';
      },
    );

  const recorrido = Array.isArray(
    item.recorrido,
  )
    ? item.recorrido[0] || null
    : item.recorrido || null;

  const distanciaMetros =
    Number(
      recorrido?.distancia_recorrida_metros,
    ) || 0;

  return {
    id_programacion:
      item.id_programacion,

    fecha_programada:
      item.fecha_programada,

    hora_inicio_programada:
      item.hora_inicio_programada,

    hora_fin_programada:
      item.hora_fin_programada,

    duracion_programada_minutos:
      calcularDuracionProgramadaMinutos({
        hora_inicio_programada:
          item.hora_inicio_programada,

        hora_fin_programada:
          item.hora_fin_programada,
      }),

    turno:
      item.turno,

    estado_programacion:
      item.estado_programacion,

    observacion:
      item.observacion,

    cancelacion:
      item.estado_programacion
        === 'CANCELADA'
        ? {
          motivo:
            item.motivo_cancelacion,

          fecha:
            item.fecha_cancelacion,
        }
        : null,

    ruta: item.ruta
      ? {
        id_ruta:
          item.ruta.id_ruta,

        codigo:
          item.ruta.codigo_ruta
          ?? item.ruta.codigo
          ?? null,

        nombre:
          item.ruta.nombre_ruta
          ?? item.ruta.nombre
          ?? null,

        zona: item.ruta.zona
          ? {
            id_zona:
              item.ruta.zona.id_zona,

            nombre:
              item.ruta.zona.nombre_zona
              ?? item.ruta.zona.nombre
              ?? null,
          }
          : null,
      }
      : null,

    version_ruta:
      item.version_ruta
        ? {
          id_ruta_version:
            item.version_ruta
              .id_ruta_version,

          numero_version:
            item.version_ruta
              .numero_version,
        }
        : null,

    vehiculo: item.vehiculo
      ? {
        id_vehiculo:
          item.vehiculo.id_vehiculo,

        placa:
          item.vehiculo.placa,

        codigo:
          item.vehiculo.codigo_interno
          ?? item.vehiculo.codigo
          ?? null,

        capacidad:
          item.vehiculo.capacidad,

        unidad_capacidad:
          item.vehiculo
            .unidad_capacidad,

        estado:
          item.vehiculo
            .estado_vehiculo
          ?? item.vehiculo.estado
          ?? null,
      }
      : null,

    personal: {
      conductor: conductor
        ? {
          id_programacion_personal:
            conductor
              .id_programacion_personal,

          id_personal:
            conductor.id_personal,

          nombre:
            obtenerNombrePersonal(
              conductor,
            ),

          estado_asignacion:
            conductor.estado_asignacion
            ?? conductor.estado
            ?? null,
        }
        : null,

      recolectores:
        recolectores.map(
          (asignacion) => ({
            id_programacion_personal:
              asignacion
                .id_programacion_personal,

            id_personal:
              asignacion.id_personal,

            nombre:
              obtenerNombrePersonal(
                asignacion,
              ),

            estado_asignacion:
              asignacion.estado_asignacion
              ?? asignacion.estado
              ?? null,
          }),
        ),

      supervisores:
        supervisores.map(
          (asignacion) => ({
            id_programacion_personal:
              asignacion
                .id_programacion_personal,

            id_personal:
              asignacion.id_personal,

            nombre:
              obtenerNombrePersonal(
                asignacion,
              ),

            estado_asignacion:
              asignacion.estado_asignacion
              ?? asignacion.estado
              ?? null,
          }),
        ),

      total_asignado:
        personalAsignado.length,
    },

    recorrido: recorrido
      ? {
        id_recorrido:
          recorrido.id_recorrido,

        estado_recorrido:
          recorrido.estado_recorrido,

        fecha_hora_inicio:
          recorrido.fecha_hora_inicio,

        fecha_hora_finalizacion:
          recorrido
            .fecha_hora_finalizacion,

        duracion_segundos:
          recorrido.duracion_segundos,

        duracion_formateada:
          formatearDuracion(
            recorrido.duracion_segundos,
          ),

        distancia_recorrida_metros:
          distanciaMetros,

        distancia_recorrida_km:
          Number(
            (
              distanciaMetros / 1000
            ).toFixed(2),
          ),
      }
      : null,

    created_at:
      item.created_at,

    updated_at:
      item.updated_at,
  };
};

/*
|--------------------------------------------------------------------------
| Obtener resumen por estado
|--------------------------------------------------------------------------
*/

const obtenerResumenProgramaciones = async ({
  where,
  transaction = null,
}) => {
  /*
  | Para este resumen solo se incluyen Ruta y Vehiculo porque pueden
  | intervenir en filtros de zona, búsqueda, ruta y vehículo.
  |
  | Personal se agrega cuando existe un filtro relacionado.
  */

  const necesitaPersonal =
    tieneValor(
      where[
      '$personal_asignado.id_personal$'
      ],
    );

  const include = [
    {
      model: Ruta,
      as: 'ruta',
      required: false,

      attributes: [],

      include: [
        {
          model: Zona,
          as: 'zona',
          required: false,
          attributes: [],
        },
      ],
    },

    {
      model: Vehiculo,
      as: 'vehiculo',
      required: false,
      attributes: [],
    },
  ];

  if (necesitaPersonal) {
    include.push({
      model: ProgramacionPersonal,
      as: 'personal_asignado',
      required: true,
      attributes: [],
    });
  }

  const programaciones =
    await ProgramacionRuta.findAll({
      where,
      include,

      attributes: [
        'id_programacion',
        'estado_programacion',
      ],

      transaction,

      distinct: true,
      subQuery: false,
    });

  /*
  | Se cuentan los IDs únicos para evitar duplicados producidos
  | por las asignaciones de personal.
  */

  const registrosUnicos = new Map();

  programaciones.forEach((programacion) => {
    const item = programacion.get({
      plain: true,
    });

    registrosUnicos.set(
      String(item.id_programacion),
      item,
    );
  });

  const resumen = {
    total_programaciones: 0,

    programadas: 0,
    asignadas: 0,
    aceptadas: 0,
    en_curso: 0,
    pausadas: 0,
    finalizadas: 0,
    canceladas: 0,

    porcentaje_cumplimiento: 0,
    porcentaje_cancelacion: 0,
  };

  const campoPorEstado = {
    PROGRAMADA:
      'programadas',

    ASIGNADA:
      'asignadas',

    ACEPTADA:
      'aceptadas',

    EN_CURSO:
      'en_curso',

    PAUSADA:
      'pausadas',

    FINALIZADA:
      'finalizadas',

    CANCELADA:
      'canceladas',
  };

  registrosUnicos.forEach((item) => {
    resumen.total_programaciones += 1;

    const campo =
      campoPorEstado[
      item.estado_programacion
      ];

    if (campo) {
      resumen[campo] += 1;
    }
  });

  if (resumen.total_programaciones > 0) {
    resumen.porcentaje_cumplimiento =
      Number(
        (
          (
            resumen.finalizadas
            / resumen.total_programaciones
          ) * 100
        ).toFixed(2),
      );

    resumen.porcentaje_cancelacion =
      Number(
        (
          (
            resumen.canceladas
            / resumen.total_programaciones
          ) * 100
        ).toFixed(2),
      );
  }

  return resumen;
};

/*
|--------------------------------------------------------------------------
| Obtener reporte paginado
|--------------------------------------------------------------------------
*/

const obtenerReporteProgramacionesService = async ({
  query = {},
  usuario,
  transaction = null,
}) => {
  validarConsultaReporte({
    tipoReporte:
      TIPOS_REPORTE.PROGRAMACIONES,

    query,

    fechasRequeridas: true,
  });

  const filtros =
    normalizarFiltrosReporte({
      tipoReporte:
        TIPOS_REPORTE.PROGRAMACIONES,

      query,

      usarMesActual: false,
    });

  /*
  | La utilidad compartida devuelve "estado".
  | En este service se aplica sobre estado_programacion.
  */

  const where =
    construirWhereProgramaciones(
      filtros,
    );

  /*
  |--------------------------------------------------------------------------
  | Alcance del usuario
  |--------------------------------------------------------------------------
  |
  | Aquí se aplicará posteriormente una utilidad central según tus roles.
  | Nunca debe confiarse únicamente en los filtros enviados por Angular.
  |
  | Ejemplo:
  |
  | aplicarAlcanceReporteProgramaciones({
  |   where,
  |   usuario,
  | });
  |
  */

  void usuario;

  const include =
    construirIncludesProgramacion({
      incluirPersonal: true,
      incluirRecorrido: true,
    });

  const [
    resultado,
    resumen,
  ] = await Promise.all([
    ProgramacionRuta.findAndCountAll({
      where,
      include,

      limit:
        filtros.limit,

      offset:
        filtros.offset,

      order:
        obtenerOrdenProgramaciones(
          filtros,
        ),

      distinct: true,
      col:
        'id_programacion',

      subQuery: false,

      transaction,
    }),

    obtenerResumenProgramaciones({
      where,
      transaction,
    }),
  ]);

  const items =
    resultado.rows.map(
      transformarProgramacion,
    );

  return {
    resumen,

    items,

    pagination:
      construirPaginacionRespuesta({
        page:
          filtros.page,

        limit:
          filtros.limit,

        total:
          resultado.count,
      }),

    filtros_aplicados:
      obtenerFiltrosAplicados(
        filtros,
      ),
  };
};

/*
|--------------------------------------------------------------------------
| Obtener dataset sin paginación
|--------------------------------------------------------------------------
|
| Este método será utilizado por los exportadores PDF, Excel y CSV.
|
*/

const obtenerDatasetProgramacionesService = async ({
  query = {},
  usuario,
  limite,
  transaction = null,
}) => {
  validarConsultaReporte({
    tipoReporte:
      TIPOS_REPORTE.PROGRAMACIONES,

    query,

    fechasRequeridas: true,
  });

  const filtros =
    normalizarFiltrosReporte({
      tipoReporte:
        TIPOS_REPORTE.PROGRAMACIONES,

      query,

      usarMesActual: false,
    });

  const where =
    construirWhereProgramaciones(
      filtros,
    );

  /*
  | Aplicar aquí el mismo alcance de seguridad utilizado
  | por el listado paginado.
  */

  void usuario;

  const programaciones =
    await ProgramacionRuta.findAll({
      where,

      include:
        construirIncludesProgramacion({
          incluirPersonal: true,
          incluirRecorrido: true,
        }),

      order:
        obtenerOrdenProgramaciones(
          filtros,
        ),

      /*
      | El límite debe provenir del formato:
      |
      | PDF: 1000
      | XLSX: 10000
      | CSV: 50000
      */

      limit:
        Number(limite),

      distinct: true,
      subQuery: false,

      transaction,
    });

  const resumen =
    await obtenerResumenProgramaciones({
      where,
      transaction,
    });

  return {
    resumen,

    items:
      programaciones.map(
        transformarProgramacion,
      ),

    filtros_aplicados:
      obtenerFiltrosAplicados(
        filtros,
      ),
  };
};

module.exports = {
  obtenerReporteProgramacionesService,
  obtenerDatasetProgramacionesService,
};