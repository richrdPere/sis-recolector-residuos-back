const AppError = require('./app-error');

const DIAS = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

const parseDateOnly = (value, field = 'fecha') => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new AppError(
      `El campo ${field} debe tener formato YYYY-MM-DD.`,
      400,
      'INVALID_DATE',
    );
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new AppError(
      `El campo ${field} no contiene una fecha válida.`,
      400,
      'INVALID_DATE',
    );
  }

  return date;
};

const formatDateOnly = (date) =>
  date.toISOString().slice(0, 10);

const addDays = (fecha, days) => {
  const date = parseDateOnly(fecha);

  date.setUTCDate(date.getUTCDate() + days);

  return formatDateOnly(date);
};

const getPeruDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const getWeekDay = (fecha) =>
  DIAS[parseDateOnly(fecha).getUTCDay()];

const scheduleAppliesToDate = (schedule, fecha) => {
  const candidate = parseDateOnly(fecha);
  const startValue = schedule.fecha_vigencia_desde;
  const endValue = schedule.fecha_vigencia_hasta;
  const start = parseDateOnly(startValue);

  if (
    fecha < startValue ||
    (endValue && fecha > endValue)
  ) {
    return false;
  }

  const matchesWeekDay =
    DIAS[candidate.getUTCDay()] === schedule.dia_semana;

  switch (schedule.frecuencia) {
    case 'SEMANAL':
      return matchesWeekDay;

    case 'QUINCENAL': {
      const days = Math.floor(
        (candidate.getTime() - start.getTime()) / 86400000,
      );

      return matchesWeekDay && Math.floor(days / 7) % 2 === 0;
    }

    case 'MENSUAL':
      return candidate.getUTCDate() === start.getUTCDate();

    case 'ESPECIAL':
      return fecha === startValue;

    default:
      return false;
  }
};

const normalizeTime = (value) => {
  const time = String(value);

  if (!/^\d{2}:\d{2}(?::\d{2})?$/.test(time)) {
    throw new AppError(
      'Existe una hora inválida en el calendario.',
      500,
      'INVALID_CALENDAR_TIME',
    );
  }

  const [hours, minutes, seconds = 0] =
    time.split(':').map(Number);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new AppError(
      'Existe una hora inválida en el calendario.',
      500,
      'INVALID_CALENDAR_TIME',
    );
  }

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

const buildWindow = (fecha, inicio, fin) => {
  const horaInicio = normalizeTime(inicio);
  const horaFin = normalizeTime(fin);

  // Tus modelos actuales consideran jornadas en el mismo día.
  if (horaFin <= horaInicio) {
    throw new AppError(
      'La hora final debe ser posterior a la inicial.',
      500,
      'INVALID_CALENDAR_WINDOW',
    );
  }

  return {
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    inicio: `${fecha}T${horaInicio}-05:00`,
    fin: `${fecha}T${horaFin}-05:00`,
  };
};

module.exports = {
  parseDateOnly,
  formatDateOnly,
  addDays,
  getPeruDate,
  getWeekDay,
  scheduleAppliesToDate,
  buildWindow,
};