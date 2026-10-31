'use strict';

const { Op } = require('sequelize');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils
const { validateId } = require('../../utils/motor-notification.utils');

// Modelos
const {
  Usuario,
  Ciudadano,
} = db;

// ==========================================================
// EVENTOS CIUDADANOS ADMITIDOS
// ==========================================================

const EVENT_PREFERENCES = Object.freeze({
  RECORDATORIO: 'notificar_recordatorio',
  INICIO_RUTA: 'notificar_inicio_ruta',
  PROXIMIDAD_VEHICULO: 'notificar_proximidad_vehiculo',
  CAMBIO_HORARIO: 'notificar_cambio_horario',
  CAMBIO_RUTA: 'notificar_cambio_ruta',
  CANCELACION: 'notificar_cancelacion',
  INCIDENCIA: 'notificar_incidencias',
});

// ==========================================================
// FECHAS
// ==========================================================

const parseDate = (value, field) => {
  if (value == null) return null;

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new AppError(
      `El campo ${field} no contiene una fecha válida.`,
      400,
      'INVALID_NOTIFICATION_DATE',
    );
  }

  return date;
};

// ==========================================================
// HORARIO DE SILENCIO EN AMERICA/LIMA
// ==========================================================

const timeToSeconds = (value) => {
  const match = String(value).match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/,
  );

  if (!match) {
    throw new AppError(
      'El horario de silencio no es válido.',
      409,
      'INVALID_SILENT_HOURS',
    );
  }

  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3] || 0)
  );
};

const deferSilentHours = (date, preferences) => {
  const startValue =
    preferences.hora_silencio_inicio;

  const endValue =
    preferences.hora_silencio_fin;

  if (!startValue && !endValue) {
    return date;
  }

  if (!startValue || !endValue) {
    throw new AppError(
      'El horario de silencio está incompleto.',
      409,
      'INCOMPLETE_SILENT_HOURS',
    );
  }

  const start = timeToSeconds(startValue);
  const end = timeToSeconds(endValue);

  if (start === end) {
    throw new AppError(
      'El inicio y fin del silencio deben ser diferentes.',
      409,
      'AMBIGUOUS_SILENT_HOURS',
    );
  }

  const parts = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'America/Lima',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  ).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [
      part.type,
      part.value,
    ]),
  );

  const current =
    Number(values.hour) * 3600 +
    Number(values.minute) * 60 +
    Number(values.second);

  const inside = start < end
    ? current >= start && current < end
    : current >= start || current < end;

  if (!inside) return date;

  const secondsToEnd =
    (end - current + 86400) % 86400;

  /*
   * America/Lima no cambia de horario estacional.
   * Se difiere el aviso completo hasta terminar el silencio.
   */
  return new Date(
    date.getTime() -
    date.getMilliseconds() +
    secondsToEnd * 1000,
  );
};

// ==========================================================
// SERVICE: RESOLVER DESTINATARIOS ANTES DE CREAR LA NOTIFICACIÓN
// ==========================================================

const resolveRecipientsService = async ({
  tipo_destino = 'USUARIOS',
  destinatarios = [],
  evento = null,
  id_ruta = null,
  id_zona = null,
  enviar_interna = true,
  enviar_push = true,
  fecha_programada = null,
  fecha_expiracion = null,
  fecha_servicio = null,
  transaction = null,
  maxDestinatarios = 1000,
} = {}) => {
  if (
    !['USUARIOS', 'CIUDADANOS'].includes(
      tipo_destino,
    ) ||
    typeof enviar_interna !== 'boolean' ||
    typeof enviar_push !== 'boolean' ||
    (!enviar_interna && !enviar_push) ||
    !Number.isInteger(maxDestinatarios) ||
    maxDestinatarios < 1 ||
    maxDestinatarios > 10000
  ) {
    throw new AppError(
      'Las opciones de destinatarios no son válidas.',
      400,
      'INVALID_RECIPIENT_OPTIONS',
    );
  }

  const now = new Date();

  const programmedDate = parseDate(
    fecha_programada,
    'fecha_programada',
  );

  const expirationDate = parseDate(
    fecha_expiracion,
    'fecha_expiracion',
  );

  const serviceDate = parseDate(
    fecha_servicio,
    'fecha_servicio',
  );

  if (
    expirationDate &&
    (
      expirationDate <= now ||
      (
        programmedDate &&
        expirationDate <= programmedDate
      )
    )
  ) {
    throw new AppError(
      'La expiración debe ser posterior al envío.',
      400,
      'INVALID_NOTIFICATION_EXPIRATION',
    );
  }

  const groups = new Map();
  let excluded = 0;

  const addRecipient = (
    userId,
    internal,
    push,
    date,
  ) => {
    if (!internal && !push) {
      excluded++;
      return;
    }

    if (
      expirationDate &&
      date >= expirationDate
    ) {
      excluded++;
      return;
    }

    const schedule =
      date > now ? date : null;

    const key = [
      internal ? 'I' : '',
      push ? 'P' : '',
      schedule?.toISOString() || 'AHORA',
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        enviar_interna: internal,
        enviar_push: push,
        fecha_programada: schedule,
        destinatarios: new Set(),
      });
    }

    groups.get(key).destinatarios.add(
      String(userId),
    );
  };

  // --------------------------------------------------------
  // USUARIOS EXPLÍCITOS
  // --------------------------------------------------------

  if (tipo_destino === 'USUARIOS') {
    if (
      !Array.isArray(destinatarios) ||
      destinatarios.length > maxDestinatarios
    ) {
      throw new AppError(
        'La lista de destinatarios no es válida o supera el límite.',
        400,
        'INVALID_RECIPIENT_LIST',
      );
    }

    const ids = [
      ...new Set(
        destinatarios.map(validateId),
      ),
    ];

    if (ids.length) {
      const users = await Usuario.findAll({
        where: {
          id_usuario: {
            [Op.in]: ids,
          },
          estado: true,
        },
        attributes: ['id_usuario'],
        transaction,
      });

      const found = new Set(
        users.map((user) =>
          String(user.id_usuario),
        ),
      );

      excluded += ids.length - found.size;

      for (const userId of ids) {
        if (!found.has(userId)) continue;

        addRecipient(
          userId,
          enviar_interna,
          enviar_push,
          programmedDate > now
            ? programmedDate
            : now,
        );
      }
    }
  } else {
    // ------------------------------------------------------
    // CIUDADANOS POR RUTA O ZONA
    // ------------------------------------------------------

    const normalizedEvent =
      String(evento || '')
        .trim()
        .toUpperCase();

    const preferenceField =
      EVENT_PREFERENCES[normalizedEvent];

    if (!preferenceField) {
      throw new AppError(
        'El evento ciudadano no está configurado.',
        400,
        'UNSUPPORTED_CITIZEN_EVENT',
      );
    }

    if (
      normalizedEvent === 'RECORDATORIO' &&
      !serviceDate
    ) {
      throw new AppError(
        'Un recordatorio requiere fecha_servicio.',
        400,
        'SERVICE_DATE_REQUIRED',
      );
    }

    if (id_ruta == null && id_zona == null) {
      throw new AppError(
        'Debe indicar una ruta o zona.',
        400,
        'RECIPIENT_SCOPE_REQUIRED',
      );
    }

    /*
     * La ruta tiene prioridad. No incluye automáticamente
     * a todos los ciudadanos de la zona de esa ruta.
     */
    const addressWhere = {
      estado_domicilio: 'ACTIVO',
    };

    if (id_ruta != null) {
      addressWhere.id_ruta =
        validateId(id_ruta);
    }

    if (id_zona != null) {
      addressWhere.id_zona =
        validateId(id_zona);
    }

    const citizens = await Ciudadano.findAll({
      where: {
        estado_ciudadano: 'ACTIVO',
        acepta_tratamiento_datos: true,
      },

      include: [
        {
          association: 'usuario',
          required: true,
          attributes: ['id_usuario'],
          where: {
            estado: true,
          },
        },
        {
          association: 'domicilios',
          required: true,
          attributes: ['id_domicilio'],
          where: addressWhere,
        },
        {
          association: 'preferencias_notificacion',
          required: true,
          where: {
            estado_preferencia: 'ACTIVA',
            notificaciones_habilitadas: true,
            [preferenceField]: true,
          },
        },
      ],

      order: [
        ['id_ciudadano', 'ASC'],
      ],

      limit: maxDestinatarios + 1,
      transaction,
    });

    if (citizens.length > maxDestinatarios) {
      throw new AppError(
        'El alcance supera el límite; procese los destinatarios por lotes.',
        400,
        'RECIPIENT_LIMIT_EXCEEDED',
      );
    }

    for (const citizen of citizens) {
      const preferences =
        citizen.preferencias_notificacion;

      let date = programmedDate > now
        ? programmedDate
        : now;

      if (normalizedEvent === 'RECORDATORIO') {
        if (serviceDate <= now) {
          excluded++;
          continue;
        }

        const reminderDate = new Date(
          serviceDate.getTime() -
          Number(
            preferences.minutos_anticipacion,
          ) * 60000,
        );

        date = reminderDate > now
          ? reminderDate
          : now;
      }

      date = deferSilentHours(
        date,
        preferences,
      );

      // No enviar un recordatorio después del servicio.
      if (
        normalizedEvent === 'RECORDATORIO' &&
        date >= serviceDate
      ) {
        excluded++;
        continue;
      }

      addRecipient(
        citizen.id_usuario,

        enviar_interna &&
        Boolean(
          preferences.canal_interno,
        ),

        enviar_push &&
        Boolean(
          preferences.canal_push,
        ),

        date,
      );
    }
  }

  const resultGroups = [
    ...groups.values(),
  ].map((group) => ({
    ...group,

    destinatarios: [
      ...group.destinatarios,
    ].sort((a, b) =>
      BigInt(a) < BigInt(b)
        ? -1
        : BigInt(a) > BigInt(b)
          ? 1
          : 0,
    ),
  }));

  return {
    grupos: resultGroups,

    total_destinatarios: new Set(
      resultGroups.flatMap(
        (group) => group.destinatarios,
      ),
    ).size,

    excluidos: excluded,
  };
};

module.exports = resolveRecipientsService;