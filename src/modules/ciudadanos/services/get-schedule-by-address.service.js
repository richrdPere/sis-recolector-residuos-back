const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  validateId,
} = require('../validations/ciudadano.validation');

const {
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
} = require('../utils/ciudadano-service.utils');

const {
  parseDateOnly,
  addDays,
  getPeruDate,
  getWeekDay,
  scheduleAppliesToDate,
  buildWindow,
} = require('../../../utils/calendario-recoleccion.utils');

const {
  RutaHorario,
  ProgramacionRuta,
  CiudadanoDomicilio,
} = db;

// ==========================================================
// ESTADO PÚBLICO
// No inferimos FINALIZADO porque haya terminado la franja.
// ==========================================================

const getPublicState = (programacion) => {
  const estadoProgramacion = programacion.estado_programacion;
  const estadoRecorrido =
    programacion.recorrido?.estado_recorrido ?? null;

  // Una cancelación invalida el servicio.
  if (
    estadoProgramacion === 'CANCELADA' ||
    estadoRecorrido === 'CANCELADO'
  ) {
    return 'CANCELADO';
  }

  if (
    estadoProgramacion === 'FINALIZADA' ||
    estadoRecorrido === 'FINALIZADO'
  ) {
    return 'FINALIZADO';
  }

  if (estadoRecorrido) {
    switch (estadoRecorrido) {
      case 'PAUSADO':
        return 'PAUSADO';

      case 'EN_CURSO':
        return 'EN_CURSO';

      default:
        throw new AppError(
          'El recorrido tiene un estado no reconocido.',
          500,
          'INVALID_CALENDAR_STATE',
        );
    }
  }

  switch (estadoProgramacion) {
    case 'PAUSADA':
      return 'PAUSADO';

    case 'EN_CURSO':
      return 'EN_CURSO';

    case 'PROGRAMADA':
    case 'ASIGNADA':
    case 'ACEPTADA':
      return 'PENDIENTE';

    default:
      throw new AppError(
        'La programación tiene un estado no reconocido.',
        500,
        'INVALID_CALENDAR_STATE',
      );
  }
};

const getScheduleByAddressService = async ({
  id_usuario,
  id_domicilio,
  fecha_referencia = null,
  fecha_desde = null,
  fecha_hasta = null,
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const addressId = validateId(
    id_domicilio,
    'identificador del domicilio',
  );

  // Capturar una sola hora para toda la respuesta.
  const now = new Date();
  const nowMs = now.getTime();
  const today = getPeruDate(now);

  const reference = fecha_referencia ?? today;

  parseDateOnly(reference, 'fecha_referencia');

  const desde = fecha_desde ?? reference;
  parseDateOnly(desde, 'fecha_desde');

  // Por defecto: 90 días, incluyendo el primero.
  const hasta = fecha_hasta ?? addDays(desde, 89);
  parseDateOnly(hasta, 'fecha_hasta');

  const days =
    (parseDateOnly(hasta).getTime() -
      parseDateOnly(desde).getTime()) /
    86400000;

  if (days < 0 || days > 92) {
    throw new AppError(
      'El periodo debe contener entre 1 y 93 días.',
      400,
      'INVALID_CALENDAR_PERIOD',
    );
  }

  const ciudadano = await getCitizenByUserOrFail(userId);

  if (ciudadano.estado_ciudadano !== 'ACTIVO') {
    throw new AppError(
      'El perfil ciudadano no se encuentra activo.',
      409,
      'CITIZEN_PROFILE_NOT_ACTIVE',
    );
  }

  const domicilio = await getAddressOwnedOrFail({
    idDomicilio: addressId,
    idCiudadano: ciudadano.id_ciudadano,
  });

  if (domicilio.estado_domicilio !== 'ACTIVO') {
    throw new AppError(
      'El domicilio no se encuentra activo.',
      409,
      'CITIZEN_ADDRESS_NOT_ACTIVE',
    );
  }

  if (!domicilio.id_ruta) {
    throw new AppError(
      'El domicilio no tiene una ruta de recolección asignada.',
      409,
      'ADDRESS_WITHOUT_ROUTE',
    );
  }

  // Consultas independientes.
  const [horariosRows, programacionesRows, detalle] =
    await Promise.all([
      RutaHorario.findAll({
        where: {
          id_ruta: domicilio.id_ruta,
          estado: true,

          fecha_vigencia_desde: {
            [Op.lte]: hasta,
          },

          [Op.or]: [
            { fecha_vigencia_hasta: null },
            {
              fecha_vigencia_hasta: {
                [Op.gte]: desde,
              },
            },
          ],
        },

        order: [
          ['dia_semana', 'ASC'],
          ['hora_inicio', 'ASC'],
          ['id_ruta_horario', 'ASC'],
        ],
      }),

      ProgramacionRuta.findAll({
        where: {
          id_ruta: domicilio.id_ruta,

          fecha_programada: {
            [Op.between]: [desde, hasta],
          },
        },

        // No exponemos equipo, usuarios ni observaciones internas.
        attributes: [
          'id_programacion',
          'fecha_programada',
          'hora_inicio_programada',
          'hora_fin_programada',
          'estado_programacion',
        ],

        include: [
          {
            association: 'recorrido',
            required: false,

            attributes: [
              'id_recorrido',
              'estado_recorrido',
            ],
          },
        ],

        order: [
          ['fecha_programada', 'ASC'],
          ['hora_inicio_programada', 'ASC'],
          ['id_programacion', 'ASC'],
        ],
      }),

      CiudadanoDomicilio.findOne({
        where: {
          id_domicilio: addressId,
          id_ciudadano: ciudadano.id_ciudadano,
          estado_domicilio: 'ACTIVO',
        },

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
            association: 'zona',
            attributes: ['id_zona', 'nombre'],
          },
          {
            association: 'ruta',
            required: true,
            attributes: ['id_ruta', 'nombre'],
          },
        ],
      }),
    ]);

  if (!detalle) {
    throw new AppError(
      'El domicilio o su ruta ya no están disponibles.',
      409,
      'ADDRESS_CALENDAR_NOT_AVAILABLE',
    );
  }

  const horarios = horariosRows.map((row) =>
    row.get({ plain: true }),
  );

  // ========================================================
  // EVENTOS HABITUALES: REFERENCIAS, NO SERVICIOS CONFIRMADOS
  // ========================================================

  const eventosHabituales = [];

  for (
    let fecha = desde;
    fecha <= hasta;
    fecha = addDays(fecha, 1)
  ) {
    for (const horario of horarios) {
      if (!scheduleAppliesToDate(horario, fecha)) {
        continue;
      }

      const ventana = buildWindow(
        fecha,
        horario.hora_inicio,
        horario.hora_fin,
      );

      eventosHabituales.push({
        id_evento:
          `H-${horario.id_ruta_horario}-${fecha}`,

        tipo: 'HORARIO_HABITUAL',
        confirmado: false,

        id_horario: horario.id_ruta_horario,
        id_programacion: null,

        fecha,
        dia_semana: getWeekDay(fecha),
        frecuencia: horario.frecuencia,

        ...ventana,

        // REFERENCIAL no significa PENDIENTE.
        estado: 'REFERENCIAL',

        franja_vencida:
          new Date(ventana.fin).getTime() <= nowMs,
      });
    }
  }

  // ========================================================
  // SERVICIOS REALES: FECHA/HORAS DE PROGRAMACIÓN
  // ========================================================

  const serviciosProgramados = programacionesRows.map((row) => {
    const programacion = row.get({ plain: true });
    const fecha = programacion.fecha_programada;

    const ventana = buildWindow(
      fecha,
      programacion.hora_inicio_programada,
      programacion.hora_fin_programada,
    );

    return {
      id_evento: `P-${programacion.id_programacion}`,

      tipo: 'SERVICIO_PROGRAMADO',

      id_programacion: programacion.id_programacion,

      // ProgramacionRuta no guarda id_ruta_horario.
      // No inventamos una asociación por similitud de horas.
      id_horario: null,
      frecuencia: null,

      fecha,
      dia_semana: getWeekDay(fecha),

      ...ventana,

      estado: getPublicState(programacion),

      id_recorrido:
        programacion.recorrido?.id_recorrido ?? null,

      franja_vencida:
        new Date(ventana.fin).getTime() <= nowMs,
    };
  });

  const sortEvents = (a, b) =>
    a.inicio.localeCompare(b.inicio) ||
    a.id_evento.localeCompare(b.id_evento);

  eventosHabituales.sort(sortEvents);
  serviciosProgramados.sort(sortEvents);

  // Solo servicios pendientes/en ejecución cuya franja
  // todavía no terminó. Cancelados y finalizados se excluyen.
  const proximaRecoleccion =
    serviciosProgramados.find(
      (evento) =>
        ['PENDIENTE', 'EN_CURSO', 'PAUSADO'].includes(
          evento.estado,
        ) &&
        !evento.franja_vencida,
    ) ?? null;

  const proximaReferencia =
    eventosHabituales.find(
      (evento) => !evento.franja_vencida,
    ) ?? null;

  // Permite mostrar un recorrido que sigue activo aunque
  // ya haya terminado su franja programada.
  const serviciosEnCurso = serviciosProgramados.filter(
    (evento) =>
      ['EN_CURSO', 'PAUSADO'].includes(evento.estado) &&
      new Date(evento.inicio).getTime() <= nowMs,
  );

  return {
    fecha_consulta: today,
    fecha_referencia: reference,
    consultado_en: now.toISOString(),
    zona_horaria: 'America/Lima',

    periodo: {
      fecha_desde: desde,
      fecha_hasta: hasta,
    },

    domicilio: detalle,

    // Conservamos la lista de horarios para tus modelos actuales.
    horarios,

    eventos_habituales: eventosHabituales,
    servicios_programados: serviciosProgramados,

    calendario: [
      ...eventosHabituales,
      ...serviciosProgramados,
    ].sort(sortEvents),

    servicios_en_curso: serviciosEnCurso,

    // Nunca se completa con una fecha habitual.
    proxima_recoleccion: proximaRecoleccion,

    proxima_referencia_habitual: proximaReferencia,

    tiene_proxima_recoleccion_programada:
      proximaRecoleccion !== null,
  };
};

module.exports = getScheduleByAddressService;
// const { Op } = require('sequelize');
// const db = require('../../../database/models',);
// const AppError = require('../../../utils/app-error');

// // Validations
// const {
//   validateId,
// } = require('../validations/ciudadano.validation');

// // Utils
// const {
//   getCitizenByUserOrFail,
//   getAddressOwnedOrFail,
// } = require('../utils/ciudadano-service.utils');

// // Modelos
// const { RutaHorario } = db;

// /*
// |--------------------------------------------------------------------------
// | Días de la semana
// |--------------------------------------------------------------------------
// */

// const DAYS_OF_WEEK = [
//   'DOMINGO',
//   'LUNES',
//   'MARTES',
//   'MIERCOLES',
//   'JUEVES',
//   'VIERNES',
//   'SABADO',
// ];

// /*
// |--------------------------------------------------------------------------
// | Obtener fecha actual de Perú
// |--------------------------------------------------------------------------
// */

// const getCurrentPeruDate = () => {
//   const parts =
//     new Intl.DateTimeFormat(
//       'en-US',
//       {
//         timeZone:
//           'America/Lima',

//         year:
//           'numeric',

//         month:
//           '2-digit',

//         day:
//           '2-digit',
//       },
//     ).formatToParts(
//       new Date(),
//     );

//   const values =
//     Object.fromEntries(
//       parts.map(
//         (item) => [
//           item.type,
//           item.value,
//         ],
//       ),
//     );

//   return [
//     values.year,
//     values.month,
//     values.day,
//   ].join('-');
// };

// /*
// |--------------------------------------------------------------------------
// | Validar fecha DATEONLY
// |--------------------------------------------------------------------------
// */

// const parseDateOnly = (
//   value,
//   field =
//     'fecha de referencia',
// ) => {
//   const dateValue =
//     String(
//       value || '',
//     ).trim();

//   if (
//     !/^\d{4}-\d{2}-\d{2}$/
//       .test(
//         dateValue,
//       )
//   ) {
//     throw new AppError(
//       `La ${field} no es válida.`,
//       400,
//       'INVALID_DATE',
//     );
//   }

//   const date =
//     new Date(
//       `${dateValue}T12:00:00.000Z`,
//     );

//   if (
//     Number.isNaN(
//       date.getTime(),
//     ) ||
//     date
//       .toISOString()
//       .slice(0, 10) !==
//     dateValue
//   ) {
//     throw new AppError(
//       `La ${field} no es válida.`,
//       400,
//       'INVALID_DATE',
//     );
//   }

//   return date;
// };

// const formatDateOnly = (
//   date,
// ) => {
//   return date
//     .toISOString()
//     .slice(0, 10);
// };

// const addDays = (
//   date,
//   days,
// ) => {
//   const result =
//     new Date(
//       date.getTime(),
//     );

//   result.setUTCDate(
//     result.getUTCDate() +
//     days,
//   );

//   return result;
// };

// const differenceInDays = (
//   initialDate,
//   finalDate,
// ) => {
//   const milliseconds =
//     finalDate.getTime() -
//     initialDate.getTime();

//   return Math.floor(
//     milliseconds /
//     86400000,
//   );
// };

// /*
// |--------------------------------------------------------------------------
// | Determinar si el horario aplica a una fecha
// |--------------------------------------------------------------------------
// */

// const scheduleAppliesToDate = (
//   schedule,
//   candidateDate,
// ) => {
//   const candidateDateOnly =
//     formatDateOnly(
//       candidateDate,
//     );

//   if (
//     schedule.fecha_vigencia_desde &&
//     candidateDateOnly < schedule.fecha_vigencia_desde
//   ) {
//     return false;
//   }

//   if (
//     schedule.fecha_vigencia_hasta &&
//     candidateDateOnly > schedule.fecha_vigencia_hasta
//   ) {
//     return false;
//   }

//   const weekDay =
//     DAYS_OF_WEEK[
//     candidateDate
//       .getUTCDay()
//     ];

//   const frequency =
//     String(
//       schedule.frecuencia ||
//       'SEMANAL',
//     ).toUpperCase();

//   /*
//    * Una frecuencia diaria no necesita
//    * comparar el día de la semana.
//    */

//   if (frequency === 'DIARIA') {
//     return true;
//   }

//   if (
//     String(
//       schedule.dia_semana,
//     ).toUpperCase() !==
//     weekDay
//   ) {
//     return false;
//   }

//   /*
//    * Frecuencia quincenal:
//    * utiliza fecha_inicio como fecha de referencia.
//    */

//   if (
//     frequency === 'QUINCENAL' &&
//     schedule.fecha_vigencia_desde
//   ) {
//     const startDate = parseDateOnly(
//       schedule.fecha_vigencia_desde,
//       'fecha inicial del horario',
//     );

//     const days = differenceInDays(
//       startDate,
//       candidateDate,
//     );

//     const weeks = Math.floor(days / 7);

//     return (
//       weeks >= 0 &&
//       weeks % 2 === 0
//     );
//   }

//   /*
//    * Para SEMANAL se aplica cualquier fecha
//    * que corresponda al día configurado.
//    */

//   return true;
// };

// /*
// |--------------------------------------------------------------------------
// | Buscar próxima recolección
// |--------------------------------------------------------------------------
// */

// const findNextCollection =
//   ({
//     schedules,
//     referenceDate,
//     maxSearchDays = 90,
//   }) => {
//     for (
//       let offset = 0;
//       offset <=
//       maxSearchDays;
//       offset += 1
//     ) {
//       const candidateDate =
//         addDays(
//           referenceDate,
//           offset,
//         );

//       const applicable =
//         schedules
//           .filter(
//             (schedule) =>
//               scheduleAppliesToDate(
//                 schedule,
//                 candidateDate,
//               ),
//           )
//           .sort(
//             (
//               first,
//               second,
//             ) =>
//               String(
//                 first
//                   .hora_inicio,
//               ).localeCompare(
//                 String(
//                   second
//                     .hora_inicio,
//                 ),
//               ),
//           );

//       if (
//         applicable.length
//       ) {
//         const schedule =
//           applicable[0];

//         return {
//           fecha:
//             formatDateOnly(
//               candidateDate,
//             ),

//           dia_semana:
//             DAYS_OF_WEEK[
//             candidateDate
//               .getUTCDay()
//             ],

//           hora_inicio:
//             schedule
//               .hora_inicio,

//           hora_fin:
//             schedule.hora_fin,

//           frecuencia:
//             schedule
//               .frecuencia,

//           id_horario:
//             schedule
//               .id_horario ??
//             schedule
//               .id_ruta_horario ??
//             null,
//         };
//       }
//     }

//     return null;
//   };

// /*
// |--------------------------------------------------------------------------
// | Service: consultar cronograma por domicilio
// |--------------------------------------------------------------------------
// */

// const getScheduleByAddressService = async ({
//   id_usuario,
//   id_domicilio,
//   fecha_referencia = null,
// }) => {
//   const userId =
//     validateId(
//       id_usuario,
//       'identificador del usuario',
//     );

//   const addressId =
//     validateId(
//       id_domicilio,
//       'identificador del domicilio',
//     );

//   const ciudadano =
//     await getCitizenByUserOrFail(
//       userId,
//     );

//   if (
//     ciudadano
//       .estado_ciudadano !==
//     'ACTIVO'
//   ) {
//     throw new AppError(
//       'El perfil ciudadano no se encuentra activo.',
//       409,
//       'CITIZEN_PROFILE_NOT_ACTIVE',
//     );
//   }

//   const domicilio =
//     await getAddressOwnedOrFail({
//       idDomicilio:
//         addressId,

//       idCiudadano:
//         ciudadano
//           .id_ciudadano,
//     });

//   if (
//     domicilio
//       .estado_domicilio !==
//     'ACTIVO'
//   ) {
//     throw new AppError(
//       'El domicilio no se encuentra activo.',
//       409,
//       'CITIZEN_ADDRESS_NOT_ACTIVE',
//     );
//   }

//   if (
//     !domicilio.id_ruta
//   ) {
//     throw new AppError(
//       'El domicilio todavía no tiene una ruta de recolección asignada.',
//       409,
//       'ADDRESS_WITHOUT_ROUTE',
//     );
//   }

//   const referenceDateValue =
//     fecha_referencia ||
//     getCurrentPeruDate();

//   const referenceDate =
//     parseDateOnly(
//       referenceDateValue,
//     );

//   const searchEndDate =
//     formatDateOnly(
//       addDays(
//         referenceDate,
//         90,
//       ),
//     );

//   /*
//    * Obtenemos horarios que puedan estar vigentes
//    * dentro de los siguientes 90 días.
//    */

//   const schedules = await RutaHorario.findAll({
//     where: {
//       id_ruta: domicilio.id_ruta,
//       estado: true,

//       fecha_vigencia_desde: {
//         [Op.lte]: searchEndDate,
//       },

//       [Op.or]: [
//         {
//           fecha_vigencia_hasta: null,
//         },
//         {
//           fecha_vigencia_hasta: {
//             [Op.gte]: formatDateOnly(referenceDate),
//           },
//         },
//       ],
//     },

//     order: [
//       ['dia_semana', 'ASC'],
//       ['hora_inicio', 'ASC'],
//     ],
//   });

//   if (!schedules.length) {
//     throw new AppError(
//       'No existen horarios vigentes para la ruta asociada con el domicilio.',
//       404,
//       'ROUTE_SCHEDULE_NOT_FOUND',
//     );
//   }

//   const scheduleData =
//     schedules.map(
//       (schedule) =>
//         schedule.get({
//           plain: true,
//         }),
//     );

//   const nextCollection =
//     findNextCollection({
//       schedules:
//         scheduleData,

//       referenceDate,
//     });

//   if (!nextCollection) {
//     throw new AppError(
//       'No se encontró una próxima fecha de recolección dentro de los siguientes 90 días.',
//       404,
//       'NEXT_COLLECTION_NOT_FOUND',
//     );
//   }

//   /*
//    * Cargamos el detalle del domicilio usando sus asociaciones.
//    */

//   const detailedAddress =
//     await db
//       .CiudadanoDomicilio
//       .findByPk(
//         addressId,
//         {
//           attributes: [
//             'id_domicilio',
//             'nombre_domicilio',
//             'direccion',
//             'referencia',
//             'latitud',
//             'longitud',
//             'es_principal',
//           ],

//           include: [
//             {
//               association:
//                 'zona',

//               attributes: [
//                 'id_zona',
//                 'nombre',
//               ],
//             },
//             {
//               association:
//                 'ruta',

//               attributes: [
//                 'id_ruta',
//                 'nombre',
//               ],

//               required: true,
//             },
//           ],
//         },
//       );

//   return {
//     fecha_consulta:
//       formatDateOnly(
//         referenceDate,
//       ),

//     domicilio:
//       detailedAddress,

//     horarios:
//       scheduleData,

//     proxima_recoleccion:
//       nextCollection,
//   };
// };

// module.exports = getScheduleByAddressService;