// services/update-notification-preferences.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
const {
  CiudadanoPreferenciaNotificacion,
  sequelize,
} = db;

// Constants
const ALLOWED_BOOLEAN_FIELDS = [
  'notificaciones_habilitadas',
  'canal_push',
  'canal_interno',
  'notificar_recordatorio',
  'notificar_inicio_ruta',
  'notificar_proximidad_vehiculo',
  'notificar_cambio_horario',
  'notificar_cambio_ruta',
  'notificar_cancelacion',
  'notificar_incidencias',
];

const normalizeTime = (value) => {
  if (value === null) return null;

  if (
    typeof value !== 'string' ||
    !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)
  ) {
    throw new AppError(
      'El horario de silencio debe tener formato HH:mm:ss.',
      400,
      'INVALID_SILENT_SCHEDULE',
    );
  }

  return value.length === 5
    ? `${value}:00`
    : value;
};

// ===============================================
// SERVICE: Actualizar preferencias
// ===============================================
const updateNotificationPreferencesService = async ({
  id_usuario,
  ...payload
}) => {
  const userId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  return db.sequelize.transaction(
    async (transaction) => {
      const ciudadano =
        await getCitizenByUserOrFail(
          userId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      const [preferencias] =
        await db.CiudadanoPreferenciaNotificacion.findOrCreate({
          where: {
            id_ciudadano: ciudadano.id_ciudadano,
          },
          defaults: {
            id_ciudadano: ciudadano.id_ciudadano,
            notificaciones_habilitadas: false,
            estado_preferencia: 'INACTIVA',
          },
          transaction,
        });

      const data = {};

      for (const field of BOOLEAN_FIELDS) {
        if (payload[field] === undefined) continue;

        if (typeof payload[field] !== 'boolean') {
          throw new AppError(
            `El campo ${field} debe ser booleano.`,
            400,
            'INVALID_BOOLEAN',
          );
        }

        data[field] = payload[field];
      }

      if (
        payload.minutos_anticipacion !== undefined
      ) {
        const value = payload.minutos_anticipacion;
        const minutes = Number(value);

        if (
          !['number', 'string'].includes(typeof value) ||
          (typeof value === 'string' && !value.trim()) ||
          !Number.isInteger(minutes) ||
          minutes < 15 ||
          minutes > 10080
        ) {
          throw new AppError(
            'La anticipación debe estar entre 15 minutos y 7 días.',
            400,
            'INVALID_REMINDER_ADVANCE',
          );
        }

        data.minutos_anticipacion = minutes;
      }

      if (
        payload.frecuencia_recordatorio !== undefined
      ) {
        const frequency =
          typeof payload.frecuencia_recordatorio === 'string'
            ? payload.frecuencia_recordatorio
              .trim()
              .toUpperCase()
            : '';

        if (
          !['SIEMPRE', 'SOLO_UNA_VEZ'].includes(frequency)
        ) {
          throw new AppError(
            'La frecuencia del recordatorio no es válida.',
            400,
            'INVALID_REMINDER_FREQUENCY',
          );
        }

        data.frecuencia_recordatorio = frequency;
      }

      if (
        payload.hora_silencio_inicio !== undefined ||
        payload.hora_silencio_fin !== undefined
      ) {
        // null significa borrar; undefined significa conservar.
        const start = normalizeTime(
          payload.hora_silencio_inicio !== undefined
            ? payload.hora_silencio_inicio
            : preferencias.hora_silencio_inicio ?? null,
        );

        const end = normalizeTime(
          payload.hora_silencio_fin !== undefined
            ? payload.hora_silencio_fin
            : preferencias.hora_silencio_fin ?? null,
        );

        if (
          (start === null) !== (end === null) ||
          (start !== null && start === end)
        ) {
          throw new AppError(
            'Registra ambas horas de silencio, distintas entre sí, o envía ambas como null.',
            400,
            'INVALID_SILENT_SCHEDULE',
          );
        }

        data.hora_silencio_inicio = start;
        data.hora_silencio_fin = end;
      }

      const enabled = data.notificaciones_habilitadas ?? preferencias.notificaciones_habilitadas;

      const push = data.canal_push ?? preferencias.canal_push;

      const internal = data.canal_interno ?? preferencias.canal_interno;

      if (
        enabled &&
        (
          ciudadano.estado_ciudadano !== 'ACTIVO' ||
          ciudadano.acepta_tratamiento_datos !== true
        )
      ) {
        throw new AppError(
          'Debes tener un perfil activo y consentimiento vigente para habilitar avisos.',
          409,
          'CONSENT_REQUIRED',
        );
      }

      if (enabled && !push && !internal) {
        throw new AppError(
          'Debe habilitar al menos un canal de notificación.',
          400,
          'NOTIFICATION_CHANNEL_REQUIRED',
        );
      }

      data.estado_preferencia =
        enabled ? 'ACTIVA' : 'INACTIVA';

      await preferencias.update(
        data,
        {
          transaction,
        },
      );

      return preferencias;
    },
  );
  // const transaction = await sequelize.transaction();

  // try {
  //   const ciudadano = await getCitizenByUserOrFail(
  //     userId,
  //     {
  //       transaction,
  //     },
  //   );

  //   const [
  //     preferencias,
  //   ] =
  //     await CiudadanoPreferenciaNotificacion
  //       .findOrCreate({
  //         where: {
  //           id_ciudadano:
  //             ciudadano
  //               .id_ciudadano,
  //         },

  //         defaults: {
  //           id_ciudadano:
  //             ciudadano
  //               .id_ciudadano,
  //         },

  //         transaction,
  //       });

  //   const updateData = {};

  //   for (
  //     const field of
  //     ALLOWED_BOOLEAN_FIELDS
  //   ) {
  //     if (
  //       payload[field] !==
  //       undefined
  //     ) {
  //       if (
  //         typeof payload[field] !==
  //         'boolean'
  //       ) {
  //         throw new AppError(
  //           `El campo ${field} debe ser booleano.`,
  //           400,
  //           'INVALID_BOOLEAN',
  //         );
  //       }

  //       updateData[field] =
  //         payload[field];
  //     }
  //   }

  //   if (
  //     payload.minutos_anticipacion !==
  //     undefined
  //   ) {
  //     const minutes =
  //       Number(
  //         payload
  //           .minutos_anticipacion,
  //       );

  //     if (
  //       !Number.isInteger(
  //         minutes,
  //       ) ||
  //       minutes < 15 ||
  //       minutes > 10080
  //     ) {
  //       throw new AppError(
  //         'La anticipación debe estar entre 15 minutos y 7 días.',
  //         400,
  //         'INVALID_REMINDER_ADVANCE',
  //       );
  //     }

  //     updateData
  //       .minutos_anticipacion =
  //       minutes;
  //   }

  //   if (
  //     payload.frecuencia_recordatorio !==
  //     undefined
  //   ) {
  //     const frequency =
  //       String(
  //         payload
  //           .frecuencia_recordatorio,
  //       ).toUpperCase();

  //     if (
  //       ![
  //         'SIEMPRE',
  //         'SOLO_UNA_VEZ',
  //       ].includes(
  //         frequency,
  //       )
  //     ) {
  //       throw new AppError(
  //         'La frecuencia del recordatorio no es válida.',
  //         400,
  //         'INVALID_REMINDER_FREQUENCY',
  //       );
  //     }

  //     updateData
  //       .frecuencia_recordatorio =
  //       frequency;
  //   }

  //   if (
  //     payload.hora_silencio_inicio !==
  //     undefined ||
  //     payload.hora_silencio_fin !==
  //     undefined
  //   ) {
  //     const start =
  //       payload
  //         .hora_silencio_inicio ??
  //       preferencias
  //         .hora_silencio_inicio;

  //     const end =
  //       payload
  //         .hora_silencio_fin ??
  //       preferencias
  //         .hora_silencio_fin;

  //     if (
  //       Boolean(start) !==
  //       Boolean(end)
  //     ) {
  //       throw new AppError(
  //         'Debe registrar conjuntamente el inicio y fin del horario de silencio.',
  //         400,
  //         'INCOMPLETE_SILENT_SCHEDULE',
  //       );
  //     }

  //     updateData
  //       .hora_silencio_inicio =
  //       start || null;

  //     updateData
  //       .hora_silencio_fin =
  //       end || null;
  //   }

  //   const finalEnabled =
  //     updateData
  //       .notificaciones_habilitadas ??
  //     preferencias
  //       .notificaciones_habilitadas;

  //   const finalPush =
  //     updateData.canal_push ??
  //     preferencias.canal_push;

  //   const finalInternal =
  //     updateData.canal_interno ??
  //     preferencias.canal_interno;

  //   if (
  //     finalEnabled &&
  //     !finalPush &&
  //     !finalInternal
  //   ) {
  //     throw new AppError(
  //       'Debe habilitar al menos un canal de notificación.',
  //       400,
  //       'NOTIFICATION_CHANNEL_REQUIRED',
  //     );
  //   }

  //   updateData
  //     .estado_preferencia =
  //     finalEnabled
  //       ? 'ACTIVA'
  //       : 'INACTIVA';

  //   await preferencias.update(
  //     updateData,
  //     {
  //       transaction,
  //     },
  //   );

  //   await transaction.commit();

  //   return preferencias;
  // } catch (error) {
  //   if (
  //     !transaction.finished
  //   ) {
  //     await transaction.rollback();
  //   }

  //   throw error;
  // }
};

module.exports = updateNotificationPreferencesService;