const AppError = require('../../../utils/app-error');

const titulos = {
  PROGRAMACIONES: 'Reporte de programaciones',
  RECORRIDOS: 'Reporte de recorridos',
  RECOLECCIONES: 'Residuos recolectados por recorrido',
  ATENCION_PUNTOS: 'Atención de puntos',
  INCIDENCIAS: 'Reporte de incidencias',
  VEHICULOS: 'Reporte de vehículos',
  MANTENIMIENTOS: 'Reporte de mantenimientos',
  REPORTES_CIUDADANOS: 'Reportes ciudadanos',
  RESUMEN_OPERATIVO: 'Resumen operativo',
};

// *********************************************************
// FECHAS EN HORA DE PERÚ
// *********************************************************
const fechaLocal = fecha => {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(fecha);
};

// *********************************************************
// VALOR PARA PRESENTACIÓN
// Conserva cero y distingue valores ausentes.
// *********************************************************
const texto = (valor, key = '') => {
  if (valor == null) return '';

  if (valor instanceof Date) {
    if (!Number.isFinite(valor.getTime())) {
      return '';
    }

    // DATE civil: no desplazar al día anterior.
    if (key === 'fecha_programada') {
      return valor
        .toISOString()
        .slice(0, 10)
        .split('-')
        .reverse()
        .join('/');
    }

    return fechaLocal(valor);
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  const str = String(valor);

  if (/^fecha/.test(key)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str.split('-').reverse().join('/');
    }

    if (
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(str)
    ) {
      // Los timestamps sin zona procedentes de MySQL
      // se interpretan como UTC.
      const iso =
        /(?:Z|[+-]\d{2}:\d{2})$/.test(str)
          ? str
          : `${str.replace(' ', 'T')}Z`;

      const fecha = new Date(iso);

      if (Number.isFinite(fecha.getTime())) {
        return fechaLocal(fecha);
      }
    }
  }

  return str;
};

// *********************************************************
// CAMPOS NUMÉRICOS
// *********************************************************
const numerica = key => {
  return (
    !/^id_/.test(key) &&
    /^(cantidad|costo|latitud|longitud|precision|distancia|duracion|kilometraje|porcentaje|puntos|recorridos|finalizados|resultados|total|valor|orden|obligatorio|resultado_pendiente)/
      .test(key)
  );
};

const esNumero = (valor, key) => {
  return (
    (
      typeof valor === 'number' &&
      Number.isFinite(valor)
    ) ||
    (
      numerica(key) &&
      typeof valor === 'string' &&
      /^-?\d+(\.\d+)?$/.test(valor)
    )
  );
};

// *********************************************************
// VALOR PARA EXCEL
// Los identificadores y números extensos se conservan
// como texto para evitar pérdida de precisión.
// *********************************************************
const valorExcel = (valor, key) => {
  if (valor == null) return null;

  if (/^id_/.test(key)) {
    return texto(valor, key);
  }

  if (esNumero(valor, key)) {
    const significativas = String(valor)
      .replace(/^-/, '')
      .replace('.', '')
      .replace(/^0+/, '');

    if (significativas.length <= 15) {
      return Number(valor);
    }
  }

  // No entregar objetos como { formula: ... } a ExcelJS.
  return texto(valor, key);
};

// *********************************************************
// VALIDAR DATASET
// *********************************************************
const validar = (datos, limite) => {
  if (
    !Array.isArray(datos.columnas) ||
    !datos.columnas.length ||
    datos.columnas.length > 64 ||
    !Array.isArray(datos.items) ||
    datos.columnas.some(columna =>
      !columna ||
      typeof columna.key !== 'string' ||
      !columna.key ||
      typeof columna.titulo !== 'string'
    ) ||
    new Set(
      datos.columnas.map(columna => columna.key),
    ).size !== datos.columnas.length ||
    datos.items.some(fila =>
      !fila ||
      typeof fila !== 'object' ||
      Array.isArray(fila)
    )
  ) {
    throw new AppError(
      'El conjunto de datos del reporte no es válido.',
      400,
      'INVALID_REPORT_DATASET',
    );
  }

  if (datos.items.length > limite) {
    throw new AppError(
      `Este formato admite hasta ${limite} registros.`,
      422,
      'REPORT_EXPORT_LIMIT',
    );
  }
};

// *********************************************************
// CONVERTIR RESÚMENES ANIDADOS A FILAS
// *********************************************************
const aplanar = (objeto, prefijo = '') => {
  if (
    objeto == null ||
    typeof objeto !== 'object' ||
    objeto instanceof Date
  ) {
    return [[prefijo, texto(objeto)]];
  }

  return Object.entries(objeto).flatMap(
    ([key, value]) => aplanar(
      value,
      prefijo ? `${prefijo} / ${key}` : key,
    ),
  );
};

// *********************************************************
// INFORMACIÓN DEL REPORTE
// *********************************************************
const informacion = datos => [
  [
    'Reporte',
    titulos[datos.tipo_reporte] || 'Reporte operativo',
  ],
  [
    'Generado',
    texto(
      datos.metadata?.generado_en || new Date(),
      'fecha_generacion',
    ),
  ],
  ['Zona horaria', 'America/Lima (UTC-5)'],
  [
    'Usuario solicitante',
    texto(datos.metadata?.generado_por),
  ],
  ['Registros', String(datos.items.length)],
  [
    'Base del período',
    texto(
      datos.metadata?.base_fecha ||
      datos.metadata?.nota,
    ),
  ],
  ...Object.entries(
    datos.filtros_aplicados || {},
  ).map(([key, value]) => [
    `Filtro: ${key}`,
    texto(value, key),
  ]),
];

module.exports = {
  validar,
  texto,
  esNumero,
  valorExcel,
  aplanar,
  informacion,
  titulos,
};