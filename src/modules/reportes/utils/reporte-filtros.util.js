const { Op } = require('sequelize');

const {
  PAGINACION_REPORTE,
  DIRECCIONES_ORDEN,
  ORDENAMIENTO_DEFAULT,
} = require('../constants/reporte.constants');

const {
  obtenerInicioDelDia,
  obtenerFinDelDia,
  normalizarRangoFechas,
} = require(
  './reporte-fechas.util',
);

/*
|--------------------------------------------------------------------------
| Comprobar si existe un valor
|--------------------------------------------------------------------------
*/

const tieneValor = (valor) => {
  return !(
    valor === undefined
    || valor === null
    || valor === ''
  );
};

/*
|--------------------------------------------------------------------------
| Convertir entero
|--------------------------------------------------------------------------
*/

const convertirEntero = (
  valor,
  valorDefault = null,
) => {
  if (!tieneValor(valor)) {
    return valorDefault;
  }

  const numero = Number(valor);

  if (
    !Number.isInteger(numero)
    || numero <= 0
  ) {
    return valorDefault;
  }

  return numero;
};

/*
|--------------------------------------------------------------------------
| Convertir número decimal
|--------------------------------------------------------------------------
*/

const convertirDecimal = (
  valor,
  valorDefault = null,
) => {
  if (!tieneValor(valor)) {
    return valorDefault;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : valorDefault;
};

/*
|--------------------------------------------------------------------------
| Convertir booleano
|--------------------------------------------------------------------------
*/

const convertirBooleano = (
  valor,
  valorDefault = null,
) => {
  if (!tieneValor(valor)) {
    return valorDefault;
  }

  if (
    valor === true
    || valor === 'true'
    || valor === '1'
    || valor === 1
  ) {
    return true;
  }

  if (
    valor === false
    || valor === 'false'
    || valor === '0'
    || valor === 0
  ) {
    return false;
  }

  return valorDefault;
};

/*
|--------------------------------------------------------------------------
| Normalizar texto
|--------------------------------------------------------------------------
*/

const normalizarTexto = (
  valor,
  longitudMaxima = 150,
) => {
  if (!tieneValor(valor)) {
    return null;
  }

  return String(valor)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, longitudMaxima);
};

/*
|--------------------------------------------------------------------------
| Normalizar estado o enumeración
|--------------------------------------------------------------------------
*/

const normalizarEnum = (valor) => {
  const texto = normalizarTexto(valor, 100);

  return texto
    ? texto.toUpperCase()
    : null;
};

/*
|--------------------------------------------------------------------------
| Normalizar paginación
|--------------------------------------------------------------------------
*/

const normalizarPaginacion = ({
  page,
  limit,
}) => {
  const paginaNormalizada =
    convertirEntero(
      page,
      PAGINACION_REPORTE.PAGINA_DEFAULT,
    );

  const limiteSolicitado =
    convertirEntero(
      limit,
      PAGINACION_REPORTE.LIMITE_DEFAULT,
    );

  const limiteNormalizado = Math.min(
    limiteSolicitado,
    PAGINACION_REPORTE.LIMITE_MAXIMO,
  );

  return {
    page: paginaNormalizada,
    limit: limiteNormalizado,

    offset:
      (paginaNormalizada - 1)
      * limiteNormalizado,
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar ordenamiento
|--------------------------------------------------------------------------
*/

const normalizarOrdenamiento = ({
  tipoReporte,
  sort_by,
  sort_order,
}) => {
  const ordenDefault =
    ORDENAMIENTO_DEFAULT[tipoReporte]
    || {
      sort_by: 'created_at',
      sort_order: DIRECCIONES_ORDEN.DESC,
    };

  return {
    sort_by:
      normalizarTexto(sort_by, 100)
      || ordenDefault.sort_by,

    sort_order:
      normalizarEnum(sort_order)
      || ordenDefault.sort_order,
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar todos los filtros
|--------------------------------------------------------------------------
*/

const normalizarFiltrosReporte = ({
  tipoReporte,
  query = {},
  usarMesActual = true,
}) => {
  const rango = normalizarRangoFechas({
    fecha_inicio: query.fecha_inicio,
    fecha_fin: query.fecha_fin,
    usar_mes_actual: usarMesActual,
  });

  const paginacion = normalizarPaginacion({
    page: query.page,
    limit: query.limit,
  });

  const ordenamiento =
    normalizarOrdenamiento({
      tipoReporte,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    });

  return {
    fecha_inicio: rango.fecha_inicio,
    fecha_fin: rango.fecha_fin,

    id_zona:
      convertirEntero(query.id_zona),

    id_ruta:
      convertirEntero(query.id_ruta),

    id_vehiculo:
      convertirEntero(query.id_vehiculo),

    id_usuario:
      convertirEntero(query.id_usuario),

    id_programacion:
      convertirEntero(query.id_programacion),

    id_recorrido:
      convertirEntero(query.id_recorrido),

    id_recoleccion:
      convertirEntero(query.id_recoleccion),

    id_incidencia:
      convertirEntero(query.id_incidencia),

    id_reporte_ciudadano:
      convertirEntero(
        query.id_reporte_ciudadano,
      ),

    id_conductor:
      convertirEntero(query.id_conductor),

    id_personal:
      convertirEntero(query.id_personal),

    id_punto:
      convertirEntero(query.id_punto),

    id_responsable:
      convertirEntero(query.id_responsable),

    id_ciudadano:
      convertirEntero(query.id_ciudadano),

    estado:
      normalizarEnum(query.estado),

    turno:
      normalizarEnum(query.turno),

    tipo:
      normalizarEnum(query.tipo),

    prioridad:
      normalizarEnum(query.prioridad),

    categoria:
      normalizarEnum(query.categoria),

    unidad_medida:
      normalizarEnum(query.unidad_medida),

    tipo_mantenimiento:
      normalizarEnum(
        query.tipo_mantenimiento,
      ),

    search:
      normalizarTexto(query.search, 150),

    con_gps:
      convertirBooleano(query.con_gps),

    cumplimiento_minimo:
      convertirDecimal(
        query.cumplimiento_minimo,
      ),

    cumplimiento_maximo:
      convertirDecimal(
        query.cumplimiento_maximo,
      ),

    cantidad_minima:
      convertirDecimal(query.cantidad_minima),

    cantidad_maxima:
      convertirDecimal(query.cantidad_maxima),

    porcentaje_capacidad_minimo:
      convertirDecimal(
        query.porcentaje_capacidad_minimo,
      ),

    porcentaje_capacidad_maximo:
      convertirDecimal(
        query.porcentaje_capacidad_maximo,
      ),

    ...paginacion,
    ...ordenamiento,
  };
};

/*
|--------------------------------------------------------------------------
| Construir filtro de fecha Sequelize
|--------------------------------------------------------------------------
*/

const construirFiltroFecha = ({
  fecha_inicio,
  fecha_fin,
}) => {
  if (fecha_inicio && fecha_fin) {
    return {
      [Op.between]: [
        obtenerInicioDelDia(fecha_inicio),
        obtenerFinDelDia(fecha_fin),
      ],
    };
  }

  if (fecha_inicio) {
    return {
      [Op.gte]:
        obtenerInicioDelDia(fecha_inicio),
    };
  }

  if (fecha_fin) {
    return {
      [Op.lte]:
        obtenerFinDelDia(fecha_fin),
    };
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| Agregar igualdad al where
|--------------------------------------------------------------------------
*/

const agregarFiltroIgualdad = (
  where,
  campo,
  valor,
) => {
  if (tieneValor(valor)) {
    where[campo] = valor;
  }

  return where;
};

/*
|--------------------------------------------------------------------------
| Agregar rango numérico
|--------------------------------------------------------------------------
*/

const agregarFiltroRangoNumerico = ({
  where,
  campo,
  minimo,
  maximo,
}) => {
  if (
    !tieneValor(minimo)
    && !tieneValor(maximo)
  ) {
    return where;
  }

  where[campo] = {};

  if (tieneValor(minimo)) {
    where[campo][Op.gte] = minimo;
  }

  if (tieneValor(maximo)) {
    where[campo][Op.lte] = maximo;
  }

  return where;
};

/*
|--------------------------------------------------------------------------
| Construir búsqueda OR
|--------------------------------------------------------------------------
|
| Los campos recibidos deben provenir del service, nunca de req.query.
|
*/

const construirBusqueda = ({
  search,
  campos = [],
}) => {
  if (
    !search
    || !Array.isArray(campos)
    || !campos.length
  ) {
    return null;
  }

  const patron = `%${search}%`;

  return {
    [Op.or]: campos.map((campo) => ({
      [campo]: {
        [Op.like]: patron,
      },
    })),
  };
};

/*
|--------------------------------------------------------------------------
| Construir where base
|--------------------------------------------------------------------------
|
| Cada service indica el campo de fecha correspondiente a su modelo.
|
*/

const construirWhereBaseReporte = ({
  filtros,
  campoFecha,
  camposIgualdad = {},
  camposBusqueda = [],
}) => {
  const where = {};

  if (campoFecha) {
    const filtroFecha = construirFiltroFecha({
      fecha_inicio: filtros.fecha_inicio,
      fecha_fin: filtros.fecha_fin,
    });

    if (filtroFecha) {
      where[campoFecha] = filtroFecha;
    }
  }

  Object.entries(camposIgualdad).forEach(
    ([nombreFiltro, campoModelo]) => {
      agregarFiltroIgualdad(
        where,
        campoModelo,
        filtros[nombreFiltro],
      );
    },
  );

  const filtroBusqueda = construirBusqueda({
    search: filtros.search,
    campos: camposBusqueda,
  });

  if (filtroBusqueda) {
    Object.assign(where, filtroBusqueda);
  }

  return where;
};

/*
|--------------------------------------------------------------------------
| Construir orden Sequelize
|--------------------------------------------------------------------------
*/

const construirOrdenReporte = (filtros) => {
  return [
    [
      filtros.sort_by,
      filtros.sort_order,
    ],
  ];
};

/*
|--------------------------------------------------------------------------
| Construir metadatos de paginación
|--------------------------------------------------------------------------
*/

const construirPaginacionRespuesta = ({
  page,
  limit,
  total,
}) => {
  const totalNumerico = Number(total) || 0;

  return {
    page,
    limit,
    total: totalNumerico,

    total_pages: totalNumerico === 0
      ? 0
      : Math.ceil(totalNumerico / limit),

    has_previous_page: page > 1,

    has_next_page:
      page * limit < totalNumerico,
  };
};

/*
|--------------------------------------------------------------------------
| Limpiar filtros para mostrarlos en el reporte
|--------------------------------------------------------------------------
*/

const obtenerFiltrosAplicados = (filtros) => {
  const camposOmitidos = new Set([
    'offset',
  ]);

  return Object.fromEntries(
    Object.entries(filtros).filter(
      ([clave, valor]) => {
        return (
          !camposOmitidos.has(clave)
          && valor !== null
          && valor !== undefined
          && valor !== ''
        );
      },
    ),
  );
};

module.exports = {
  tieneValor,
  convertirEntero,
  convertirDecimal,
  convertirBooleano,
  normalizarTexto,
  normalizarEnum,

  normalizarPaginacion,
  normalizarOrdenamiento,
  normalizarFiltrosReporte,

  construirFiltroFecha,
  agregarFiltroIgualdad,
  agregarFiltroRangoNumerico,
  construirBusqueda,
  construirWhereBaseReporte,
  construirOrdenReporte,

  construirPaginacionRespuesta,
  obtenerFiltrosAplicados,
};