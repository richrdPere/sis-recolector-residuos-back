const { Op } = require('sequelize');
const db = require('../../../database/models',);
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
} = require('../validations/ciudadano.validation');

// Utils
const {
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
} = require('../utils/ciudadano-service.utils');

// Modelos
const { RutaHorario } = db;

/*
|--------------------------------------------------------------------------
| Días de la semana
|--------------------------------------------------------------------------
*/

const DAYS_OF_WEEK = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

/*
|--------------------------------------------------------------------------
| Obtener fecha actual de Perú
|--------------------------------------------------------------------------
*/

const getCurrentPeruDate = () => {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone:
          'America/Lima',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      },
    ).formatToParts(
      new Date(),
    );

  const values =
    Object.fromEntries(
      parts.map(
        (item) => [
          item.type,
          item.value,
        ],
      ),
    );

  return [
    values.year,
    values.month,
    values.day,
  ].join('-');
};

/*
|--------------------------------------------------------------------------
| Validar fecha DATEONLY
|--------------------------------------------------------------------------
*/

const parseDateOnly = (
  value,
  field =
    'fecha de referencia',
) => {
  const dateValue =
    String(
      value || '',
    ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/
      .test(
        dateValue,
      )
  ) {
    throw new AppError(
      `La ${field} no es válida.`,
      400,
      'INVALID_DATE',
    );
  }

  const date =
    new Date(
      `${dateValue}T12:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
    dateValue
  ) {
    throw new AppError(
      `La ${field} no es válida.`,
      400,
      'INVALID_DATE',
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
  initialDate,
  finalDate,
) => {
  const milliseconds =
    finalDate.getTime() -
    initialDate.getTime();

  return Math.floor(
    milliseconds /
    86400000,
  );
};

/*
|--------------------------------------------------------------------------
| Determinar si el horario aplica a una fecha
|--------------------------------------------------------------------------
*/

const scheduleAppliesToDate = (
  schedule,
  candidateDate,
) => {
  const candidateDateOnly =
    formatDateOnly(
      candidateDate,
    );

  if (
    schedule.fecha_inicio &&
    candidateDateOnly <
    schedule.fecha_inicio
  ) {
    return false;
  }

  if (
    schedule.fecha_fin &&
    candidateDateOnly >
    schedule.fecha_fin
  ) {
    return false;
  }

  const weekDay =
    DAYS_OF_WEEK[
    candidateDate
      .getUTCDay()
    ];

  const frequency =
    String(
      schedule.frecuencia ||
      'SEMANAL',
    ).toUpperCase();

  /*
   * Una frecuencia diaria no necesita
   * comparar el día de la semana.
   */

  if (
    frequency ===
    'DIARIA'
  ) {
    return true;
  }

  if (
    String(
      schedule.dia_semana,
    ).toUpperCase() !==
    weekDay
  ) {
    return false;
  }

  /*
   * Frecuencia quincenal:
   * utiliza fecha_inicio como fecha de referencia.
   */

  if (
    frequency ===
    'QUINCENAL' &&
    schedule.fecha_inicio
  ) {
    const startDate =
      parseDateOnly(
        schedule
          .fecha_inicio,
        'fecha inicial del horario',
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

  /*
   * Para SEMANAL se aplica cualquier fecha
   * que corresponda al día configurado.
   */

  return true;
};

/*
|--------------------------------------------------------------------------
| Buscar próxima recolección
|--------------------------------------------------------------------------
*/

const findNextCollection =
  ({
    schedules,
    referenceDate,
    maxSearchDays = 90,
  }) => {
    for (
      let offset = 0;
      offset <=
      maxSearchDays;
      offset += 1
    ) {
      const candidateDate =
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
                candidateDate,
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

      if (
        applicable.length
      ) {
        const schedule =
          applicable[0];

        return {
          fecha:
            formatDateOnly(
              candidateDate,
            ),

          dia_semana:
            DAYS_OF_WEEK[
            candidateDate
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

          id_horario:
            schedule
              .id_horario ??
            schedule
              .id_ruta_horario ??
            null,
        };
      }
    }

    return null;
  };

/*
|--------------------------------------------------------------------------
| Service: consultar cronograma por domicilio
|--------------------------------------------------------------------------
*/

const getScheduleByAddressService = async ({
  id_usuario,
  id_domicilio,
  fecha_referencia = null,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const addressId =
    validateId(
      id_domicilio,
      'identificador del domicilio',
    );

  const ciudadano =
    await getCitizenByUserOrFail(
      userId,
    );

  if (
    ciudadano
      .estado_ciudadano !==
    'ACTIVO'
  ) {
    throw new AppError(
      'El perfil ciudadano no se encuentra activo.',
      409,
      'CITIZEN_PROFILE_NOT_ACTIVE',
    );
  }

  const domicilio =
    await getAddressOwnedOrFail({
      idDomicilio:
        addressId,

      idCiudadano:
        ciudadano
          .id_ciudadano,
    });

  if (
    domicilio
      .estado_domicilio !==
    'ACTIVO'
  ) {
    throw new AppError(
      'El domicilio no se encuentra activo.',
      409,
      'CITIZEN_ADDRESS_NOT_ACTIVE',
    );
  }

  if (
    !domicilio.id_ruta
  ) {
    throw new AppError(
      'El domicilio todavía no tiene una ruta de recolección asignada.',
      409,
      'ADDRESS_WITHOUT_ROUTE',
    );
  }

  const referenceDateValue =
    fecha_referencia ||
    getCurrentPeruDate();

  const referenceDate =
    parseDateOnly(
      referenceDateValue,
    );

  const searchEndDate =
    formatDateOnly(
      addDays(
        referenceDate,
        90,
      ),
    );

  /*
   * Obtenemos horarios que puedan estar vigentes
   * dentro de los siguientes 90 días.
   */

  const schedules =
    await RutaHorario.findAll({
      where: {
        id_ruta:
          domicilio.id_ruta,

        estado: true,

        [Op.and]: [
          {
            [Op.or]: [
              {
                fecha_inicio:
                  null,
              },
              {
                fecha_inicio: {
                  [Op.lte]:
                    searchEndDate,
                },
              },
            ],
          },
          {
            [Op.or]: [
              {
                fecha_fin:
                  null,
              },
              {
                fecha_fin: {
                  [Op.gte]:
                    formatDateOnly(
                      referenceDate,
                    ),
                },
              },
            ],
          },
        ],
      },

      order: [
        [
          'dia_semana',
          'ASC',
        ],
        [
          'hora_inicio',
          'ASC',
        ],
      ],
    });

  if (!schedules.length) {
    throw new AppError(
      'No existen horarios vigentes para la ruta asociada con el domicilio.',
      404,
      'ROUTE_SCHEDULE_NOT_FOUND',
    );
  }

  const scheduleData =
    schedules.map(
      (schedule) =>
        schedule.get({
          plain: true,
        }),
    );

  const nextCollection =
    findNextCollection({
      schedules:
        scheduleData,

      referenceDate,
    });

  if (!nextCollection) {
    throw new AppError(
      'No se encontró una próxima fecha de recolección dentro de los siguientes 90 días.',
      404,
      'NEXT_COLLECTION_NOT_FOUND',
    );
  }

  /*
   * Cargamos el detalle del domicilio usando sus asociaciones.
   */

  const detailedAddress =
    await db
      .CiudadanoDomicilio
      .findByPk(
        addressId,
        {
          attributes: [
            'id_domicilio',
            'nombre_domicilio',
            'direccion',
            'referencia',
            'latitud',
            'longitud',
            'es_principal',
          ],

          include: [
            {
              association:
                'zona',

              attributes: [
                'id_zona',
                'nombre',
              ],
            },
            {
              association:
                'ruta',

              attributes: [
                'id_ruta',
                'nombre',
              ],

              required: true,
            },
          ],
        },
      );

  return {
    fecha_consulta:
      formatDateOnly(
        referenceDate,
      ),

    domicilio:
      detailedAddress,

    horarios:
      scheduleData,

    proxima_recoleccion:
      nextCollection,
  };
};

module.exports = getScheduleByAddressService;