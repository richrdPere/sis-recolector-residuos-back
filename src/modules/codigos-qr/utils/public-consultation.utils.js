// utils/public-consultation.utils.js

const AppError =
  require(
    '../../../utils/app-error',
  );

const DAYS_OF_WEEK = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

const PUBLIC_PROGRAMMING_STATES = {
  PROGRAMADA: {
    codigo: 'PENDIENTE',
    mensaje:
      'La ruta se encuentra programada.',
  },

  ASIGNADA: {
    codigo: 'PENDIENTE',
    mensaje:
      'La ruta está preparada para iniciar.',
  },

  ACEPTADA: {
    codigo: 'PENDIENTE',
    mensaje:
      'La ruta está próxima a iniciar.',
  },

  EN_CURSO: {
    codigo: 'EN_PROCESO',
    mensaje:
      'El vehículo está realizando la ruta de recolección.',
  },

  PAUSADA: {
    codigo: 'DEMORADA',
    mensaje:
      'La ruta presenta una demora temporal.',
  },

  FINALIZADA: {
    codigo: 'COMPLETADA',
    mensaje:
      'La ruta de recolección fue completada.',
  },

  CANCELADA: {
    codigo: 'CANCELADA',
    mensaje:
      'La ruta programada fue cancelada.',
  },
};

const getPeruDateOnly =
  () => {
    const parts =
      new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone:
            'America/Lima',

          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).formatToParts(
        new Date(),
      );

    const values =
      Object.fromEntries(
        parts.map(
          (part) => [
            part.type,
            part.value,
          ],
        ),
      );

    return [
      values.year,
      values.month,
      values.day,
    ].join('-');
  };

const parseDateOnly = (
  value,
) => {
  const normalized =
    String(
      value || '',
    ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(normalized)
  ) {
    throw new AppError(
      'La fecha de referencia no es válida.',
      400,
      'INVALID_REFERENCE_DATE',
    );
  }

  const date =
    new Date(
      `${normalized}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
    normalized
  ) {
    throw new AppError(
      'La fecha de referencia no es válida.',
      400,
      'INVALID_REFERENCE_DATE',
    );
  }

  return date;
};

const formatDateOnly = (
  date,
) => {
  return date
    .toISOString()
    .slice(0, 10);
};

const addDays = (
  date,
  days,
) => {
  const result =
    new Date(
      date.getTime(),
    );

  result.setUTCDate(
    result.getUTCDate() +
    days,
  );

  return result;
};

const differenceInDays = (
  start,
  end,
) => {
  return Math.floor(
    (
      end.getTime() -
      start.getTime()
    ) /
    86400000,
  );
};

const scheduleAppliesToDate =
  (
    schedule,
    candidateDate,
  ) => {
    const candidate =
      formatDateOnly(
        candidateDate,
      );

    if (
      schedule.fecha_inicio &&
      candidate <
      schedule.fecha_inicio
    ) {
      return false;
    }

    if (
      schedule.fecha_fin &&
      candidate >
      schedule.fecha_fin
    ) {
      return false;
    }

    const frequency =
      String(
        schedule.frecuencia ||
        'SEMANAL',
      ).toUpperCase();

    if (
      frequency === 'DIARIA'
    ) {
      return true;
    }

    const day =
      DAYS_OF_WEEK[
      candidateDate
        .getUTCDay()
      ];

    if (
      String(
        schedule.dia_semana,
      ).toUpperCase() !== day
    ) {
      return false;
    }

    if (
      frequency ===
      'QUINCENAL' &&
      schedule.fecha_inicio
    ) {
      const startDate =
        parseDateOnly(
          schedule
            .fecha_inicio,
        );

      const days =
        differenceInDays(
          startDate,
          candidateDate,
        );

      const weeks =
        Math.floor(
          days / 7,
        );

      return (
        weeks >= 0 &&
        weeks % 2 === 0
      );
    }

    return true;
  };

const findNextCollection =
  ({
    schedules,
    referenceDate,
    maxDays = 90,
  }) => {
    for (
      let offset = 0;
      offset <= maxDays;
      offset += 1
    ) {
      const candidate =
        addDays(
          referenceDate,
          offset,
        );

      const applicable =
        schedules
          .filter(
            (schedule) =>
              scheduleAppliesToDate(
                schedule,
                candidate,
              ),
          )
          .sort(
            (
              first,
              second,
            ) =>
              String(
                first
                  .hora_inicio,
              ).localeCompare(
                String(
                  second
                    .hora_inicio,
                ),
              ),
          );

      if (applicable.length) {
        const schedule =
          applicable[0];

        return {
          fecha:
            formatDateOnly(
              candidate,
            ),

          dia_semana:
            DAYS_OF_WEEK[
            candidate
              .getUTCDay()
            ],

          hora_inicio:
            schedule
              .hora_inicio,

          hora_fin:
            schedule.hora_fin,

          frecuencia:
            schedule
              .frecuencia,

          dias_restantes:
            offset,
        };
      }
    }

    return null;
  };

const mapProgrammingState =
  (state) => {
    return (
      PUBLIC_PROGRAMMING_STATES[
      state
      ] || {
        codigo:
          'SIN_INFORMACION',

        mensaje:
          'No existe información pública disponible para la ruta.',
      }
    );
  };

const getRoutePublicName =
  (route) => {
    return (
      route?.nombre_ruta ||
      route?.nombre ||
      route?.codigo_ruta ||
      'Ruta de recolección'
    );
  };

const getZonePublicName =
  (zone) => {
    return (
      zone?.nombre_zona ||
      zone?.nombre ||
      zone?.codigo_zona ||
      'Sector de recolección'
    );
  };

module.exports = {
  DAYS_OF_WEEK,
  getPeruDateOnly,
  parseDateOnly,
  formatDateOnly,
  addDays,
  findNextCollection,
  mapProgrammingState,
  getRoutePublicName,
  getZonePublicName,
};