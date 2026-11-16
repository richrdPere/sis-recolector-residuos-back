'use strict';

const { Op } = require('sequelize');
const db = require('../../../../database/models');

const AppError = require('../../../../utils/app-error');

// Este servicio no contacta a Firebase ni modifica
// los resultados del historial de envíos.
const recoverProcessingNotifications = async ({
  limit = 20,
} = {}) => {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(
      'Límite de recuperación no válido.',
      400,
      'INVALID_RECOVERY_LIMIT',
    );
  }

  const now = new Date();

  const candidates =
    await db.Notificacion.findAll({
      where: {
        estado_notificacion: 'PROCESANDO',

        [Op.or]: [
          {
            procesamiento_hasta: {
              [Op.lte]: now,
            },
          },

          // Trabajos anteriores a esta migración.
          {
            procesamiento_hasta: null,
          },
        ],
      },

      attributes: [
        'id_notificacion',
      ],

      order: [
        ['id_notificacion', 'ASC'],
      ],

      limit,
    });

  const summary = {
    revisadas: candidates.length,
    recuperadas: 0,
    canceladas: 0,
    intentos_inciertos: 0,
    omitidas: 0,
  };

  for (const candidate of candidates) {
    const result =
      await db.sequelize.transaction(
        async transaction => {
          const current =
            await db.Notificacion.findByPk(
              candidate.id_notificacion,
              {
                transaction,
                lock: transaction.LOCK.UPDATE,
              },
            );

          // Volver a comprobar después de bloquear:
          // otro worker pudo renovar o recuperar la fila.
          if (
            !current ||
            current.estado_notificacion !==
            'PROCESANDO' ||
            (
              current.procesamiento_hasta &&
              new Date(
                current.procesamiento_hasta,
              ).getTime() > Date.now()
            )
          ) {
            return {
              omitida: true,
            };
          }

          const recipients =
            await db.NotificacionUsuario.findAll({
              where: {
                id_notificacion:
                  current.id_notificacion,
              },

              attributes: [
                'id_notificacion_usuario',
              ],

              transaction,
            });

          const uncertain = recipients.length
            ? await db.NotificacionEnvio.count({
              where: {
                id_notificacion_usuario: {
                  [Op.in]: recipients.map(
                    recipient =>
                      recipient.id_notificacion_usuario,
                  ),
                },

                estado_envio: {
                  [Op.in]: [
                    'PENDIENTE',
                    'PROCESANDO',
                  ],
                },
              },

              transaction,
            })
            : 0;

          const expired =
            current.fecha_expiracion &&
            new Date(
              current.fecha_expiracion,
            ).getTime() <= Date.now();

          await current.update(
            {
              estado_notificacion:
                expired
                  ? 'CANCELADA'
                  : 'PENDIENTE',

              token_procesamiento: null,
              procesamiento_hasta: null,
            },
            {
              transaction,
              hooks: false,
            },
          );

          return {
            expired,
            uncertain,
          };
        },
      );

    if (result.omitida) {
      summary.omitidas++;
      continue;
    }

    if (result.expired) {
      summary.canceladas++;
    } else {
      summary.recuperadas++;
    }

    summary.intentos_inciertos += result.uncertain;
  }

  return summary;
};

module.exports = recoverProcessingNotifications;