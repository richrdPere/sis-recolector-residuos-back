const { Op } = require('sequelize');

const AppError = require("../../../utils/app-error");

// const db = require('../../../database/models');
// const AppError = require('../../../utils/app-error');

// const {
//   sequelize,
//   Usuario,
//   Vehiculo,
//   ProgramacionRuta,
//   Recorrido,
//   VehiculoMantenimiento,
//   VehiculoMantenimientoHistorial,
// } = db;

// *********************************************************
// CONSTANTES
// *********************************************************

const TIPOS = [
  'PREVENTIVO',
  'CORRECTIVO',
];

const ESTADOS = [
  'PROGRAMADO',
  'EN_PROCESO',
  'FINALIZADO',
  'CANCELADO',
];

const ESTADOS_PROGRAMACION = [
  'PROGRAMADA',
  'ASIGNADA',
  'ACEPTADA',
  'EN_CURSO',
  'PAUSADA',
];

const CAMPOS_CREACION = [
  'id_vehiculo',
  'tipo_mantenimiento',
  'fecha_inicio_programada',
  'fecha_fin_programada',
  'motivo',
  'taller',
  'responsable_tecnico',
  'observacion',
];

const CAMPOS_ACTUALIZACION = [
  'tipo_mantenimiento',
  'fecha_inicio_programada',
  'fecha_fin_programada',
  'motivo',
  'diagnostico',
  'taller',
  'responsable_tecnico',
  'observacion',
];

const CAMPOS_FINALIZACION = [
  'kilometraje_salida',
  'diagnostico',
  'trabajos_realizados',
  'responsable_tecnico',
  'taller',
  'costo_total',
  'vehiculo_operativo',
  'observacion',
];

const CAMPOS_ORDENAMIENTO = [
  'id_mantenimiento',
  'fecha_inicio_programada',
  'fecha_fin_programada',
  'estado_mantenimiento',
  'tipo_mantenimiento',
  'created_at',
  'updated_at',
];

// *********************************************************
// VALIDACIONES BÁSICAS
// *********************************************************

const error = (message, status = 400) => {
  throw new AppError(message, status);
};

const validarId = (value, nombre = 'Identificador') => {
  if (
    typeof value === 'number' &&
    !Number.isSafeInteger(value)
  ) {
    error(`${nombre} no es válido.`);
  }

  const id = String(value ?? '');

  if (!/^[1-9]\d*$/.test(id)) {
    error(`${nombre} no es válido.`);
  }

  // Evita perder precisión en identificadores BIGINT.
  return id;
};

const validarBody = (body, permitidos) => {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body)
  ) {
    error('Debe proporcionar un objeto de datos válido.');
  }

  const desconocidos = Object.keys(body).filter(
    (key) => !permitidos.includes(key),
  );

  if (desconocidos.length) {
    error(
      `Campos no permitidos: ${desconocidos.join(', ')}.`,
    );
  }
};

const texto = (
  value,
  nombre,
  obligatorio = false,
  max = null,
) => {
  if (value == null) {
    if (obligatorio) {
      error(`${nombre} es obligatorio.`);
    }

    return null;
  }

  if (typeof value !== 'string') {
    error(`${nombre} debe ser una cadena de texto.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    if (obligatorio) {
      error(`${nombre} es obligatorio.`);
    }

    return null;
  }

  if (max && normalized.length > max) {
    error(`${nombre} no puede superar ${max} caracteres.`);
  }

  return normalized;
};

const fecha = (value, nombre) => {
  // Exige zona horaria explícita para evitar depender
  // de la configuración del servidor.
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    error(
      `${nombre} debe ser una fecha ISO con zona horaria.`,
    );
  }

  const calendar = value.slice(0, 10);
  const calendarDate = new Date(
    `${calendar}T00:00:00.000Z`,
  );

  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== calendar
  ) {
    error(`${nombre} no es válida.`);
  }

  const result = new Date(value);

  if (!Number.isFinite(result.getTime())) {
    error(`${nombre} no es válida.`);
  }

  return result;
};

const decimal = (value, nombre) => {
  if (value == null) {
    return null;
  }

  if (
    !['string', 'number'].includes(typeof value) ||
    !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(value))
  ) {
    error(
      `${nombre} debe ser un decimal no negativo de hasta dos decimales.`,
    );
  }

  return String(value);
};

const validarIntervalo = (inicio, fin) => {
  if (fin.getTime() <= inicio.getTime()) {
    error(
      'La fecha final debe ser posterior a la inicial.',
    );
  }
};

const enteroQuery = (
  value,
  defecto,
  nombre,
  max = Number.MAX_SAFE_INTEGER,
) => {
  if (value === undefined) {
    return defecto;
  }

  const parsed = Number(value);

  if (
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(parsed) ||
    parsed > max
  ) {
    error(`${nombre} no es válido.`);
  }

  return parsed;
};

// *********************************************************
// VALIDACIÓN DE DATOS EDITABLES
// *********************************************************

const prepararDatos = (body) => {
  const result = {};

  for (const key of Object.keys(body)) {
    const value = body[key];

    if (key === 'id_vehiculo') {
      result[key] = validarId(value, 'ID del vehículo');
    } else if (key === 'tipo_mantenimiento') {
      if (!TIPOS.includes(value)) {
        error('El tipo de mantenimiento no es válido.');
      }

      result[key] = value;
    } else if (
      key === 'fecha_inicio_programada' ||
      key === 'fecha_fin_programada'
    ) {
      result[key] = fecha(value, key);
    } else if (
      key === 'kilometraje_ingreso' ||
      key === 'kilometraje_salida' ||
      key === 'costo_total'
    ) {
      result[key] = decimal(value, key);
    } else if (key === 'vehiculo_operativo') {
      if (typeof value !== 'boolean') {
        error('vehiculo_operativo debe ser booleano.');
      }

      result[key] = value;
    } else {
      result[key] = texto(
        value,
        key,
        key === 'motivo',
        ['taller', 'responsable_tecnico'].includes(key)
          ? 150
          : null,
      );
    }
  }

  return result;
};

// *********************************************************
// FILTROS COMPARTIDOS
// *********************************************************

const construirFiltros = (query = {}) => {
  const where = {};

  if (query.id_vehiculo !== undefined) {
    where.id_vehiculo = validarId(
      query.id_vehiculo,
      'ID del vehículo',
    );
  }

  if (query.tipo_mantenimiento !== undefined) {
    if (!TIPOS.includes(query.tipo_mantenimiento)) {
      error('El tipo de mantenimiento no es válido.');
    }

    where.tipo_mantenimiento =
      query.tipo_mantenimiento;
  }

  if (query.estado_mantenimiento !== undefined) {
    if (!ESTADOS.includes(query.estado_mantenimiento)) {
      error('El estado de mantenimiento no es válido.');
    }

    where.estado_mantenimiento =
      query.estado_mantenimiento;
  }

  let inicio;
  let fin;

  if (query.fecha_inicio !== undefined) {
    inicio = fecha(
      query.fecha_inicio,
      'fecha_inicio',
    );
  }

  if (query.fecha_fin !== undefined) {
    fin = fecha(query.fecha_fin, 'fecha_fin');
  }

  if (inicio && fin && fin < inicio) {
    error('El rango de fechas no es válido.');
  }

  if (inicio || fin) {
    where.fecha_inicio_programada = {
      ...(inicio ? { [Op.gte]: inicio } : {}),
      ...(fin ? { [Op.lte]: fin } : {}),
    };
  }

  if (query.search !== undefined) {
    const search = texto(
      query.search,
      'search',
      false,
      150,
    );

    if (search) {
      where[Op.or] = [
        { motivo: { [Op.like]: `%${search}%` } },
        { taller: { [Op.like]: `%${search}%` } },
        {
          responsable_tecnico: {
            [Op.like]: `%${search}%`,
          },
        },
      ];
    }
  }

  return where;
};
module.exports = {
  ESTADOS,
  ESTADOS_PROGRAMACION,
  CAMPOS_CREACION,
  CAMPOS_ACTUALIZACION,
  CAMPOS_FINALIZACION,
  CAMPOS_ORDENAMIENTO,
  error,
  validarId,
  validarBody,
  texto,
  fecha,
  decimal,
  validarIntervalo,
  enteroQuery,
  prepararDatos,
  construirFiltros,
}