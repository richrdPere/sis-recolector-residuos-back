'use strict';

const { Op } = require('sequelize');
const db = require('../../../../database/models');

const AppError = require('../../../../utils/app-error');

const { validateId } = require('../../utils/motor-notification.utils');

const diagnosticoNotificacionService = async ({
  id_notificacion,
  page = 1,
}) => {
  const id = validateId(id_notificacion);
  const pagina = Number(page);

  if (
    !Number.isSafeInteger(pagina) ||
    pagina < 1 ||
    pagina > 100000
  ) {
    throw new AppError(
      'Página no válida.',
      400,
      'INVALID_PAGE',
    );
  }

  return db.sequelize.transaction(
    async transaction => {
      const notification =
        await db.Notificacion.findByPk(
          id,
          {
            attributes: [
              'id_notificacion',
              'titulo',
              'estado_notificacion',
              'created_at',
              'fecha_programada',
              'fecha_expiracion',
              'fecha_procesamiento',
              'enviar_interna',
              'enviar_push',
            ],

            transaction,
          },
        );

      if (!notification) {
        throw new AppError(
          'La notificación no existe.',
          404,
          'NOTIFICATION_NOT_FOUND',
        );
      }

      const { count, rows } =
        await db.NotificacionUsuario.findAndCountAll({
          where: {
            id_notificacion: id,
          },

          attributes: [
            'id_notificacion_usuario',
            'id_usuario',
            'estado_push',
            'leida',
            'fecha_leida',
          ],

          order: [
            ['id_notificacion_usuario', 'ASC'],
          ],

          limit: 20,
          offset: (pagina - 1) * 20,

          transaction,
        });

      const recipients = rows.map(
        row => row.get({ plain: true }),
      );

      const attempts = recipients.length
        ? await db.NotificacionEnvio.findAll({
          where: {
            id_notificacion_usuario: {
              [Op.in]: recipients.map(
                item =>
                  item.id_notificacion_usuario,
              ),
            },
          },

          // No exponer tokens, claves ni hashes.
          attributes: [
            'id_envio',
            'id_notificacion_usuario',
            'id_dispositivo',
            'numero_intento',
            'estado_envio',
            'codigo_error',
            'fecha_intento',
            'fecha_envio',
            'fecha_recepcion_app',
            'contexto_recepcion',
          ],

          order: [
            ['id_envio', 'DESC'],
          ],

          limit: 1001,

          transaction,
        })
        : [];

      const historialLimitado =
        attempts.length > 1000;

      const history = attempts
        .slice(0, 1000)
        .map(row => row.get({ plain: true }));

      const devices = recipients.length
        ? await db.UsuarioDispositivo.findAll({
          where: {
            id_usuario: {
              [Op.in]: recipients.map(
                item => item.id_usuario,
              ),
            },

            estado_dispositivo: 'ACTIVO',

            permiso_notificaciones: {
              [Op.in]: [
                'AUTORIZADO',
                'PROVISIONAL',
              ],
            },

            token_push: {
              [Op.ne]: null,
            },
          },

          attributes: [
            'id_dispositivo',
            'id_usuario',
          ],

          transaction,
        })
        : [];

      return {
        notificacion:
          notification.get({ plain: true }),

        page: pagina,
        total: count,

        total_paginas:
          Math.ceil(count / 20),

        historial_limitado:
          historialLimitado,

        destinatarios: recipients.map(
          recipient => ({
            id_notificacion_usuario: String(
              recipient.id_notificacion_usuario,
            ),

            id_usuario: String(
              recipient.id_usuario,
            ),

            estado_push:
              recipient.estado_push,

            sin_dispositivo_en_ultimo_proceso:
              recipient.estado_push ===
              'SIN_DISPOSITIVO',

            dispositivos_habilitados_actuales:
              devices.filter(
                device =>
                  String(device.id_usuario) ===
                  String(recipient.id_usuario),
              ).length,

            leida:
              recipient.leida,

            fecha_leida:
              recipient.fecha_leida,

            intentos: history
              .filter(
                attempt =>
                  String(
                    attempt.id_notificacion_usuario,
                  ) ===
                  String(
                    recipient.id_notificacion_usuario,
                  ),
              )
              .map(attempt => ({
                ...attempt,

                id_envio: String(
                  attempt.id_envio,
                ),

                id_dispositivo: String(
                  attempt.id_dispositivo,
                ),

                aceptada_firebase: attempt.estado_envio === 'ENVIADO',

                recepcion: attempt.fecha_recepcion_app
                  ? 'CONFIRMADA_APP'
                  : 'NO_CONFIRMADA',
              })),
          }),
        ),
      };
    },
  );
};

module.exports = diagnosticoNotificacionService;