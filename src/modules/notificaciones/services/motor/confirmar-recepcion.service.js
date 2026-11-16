'use strict';

const {
  createHash,
  timingSafeEqual,
} = require('node:crypto');

const db = require('../../../../database/models');

const AppError = require('../../../../utils/app-error');

const { validateId } = require('../../utils/motor-notification.utils');

const confirmarRecepcionService = async ({
  id_envio,
  prueba,
  contexto,
  id_usuario,
}) => {
  const envioId = validateId(id_envio);
  const userId = validateId(id_usuario);

  const contextos = [
    'PRIMER_PLANO',
    'SEGUNDO_PLANO',
    'APERTURA',
  ];

  if (
    typeof prueba !== 'string' ||
    !/^[0-9a-f]{64}$/.test(prueba) ||
    !contextos.includes(contexto)
  ) {
    throw new AppError(
      'Confirmación no válida.',
      400,
      'INVALID_RECEIPT',
    );
  }

  return db.sequelize.transaction(
    async transaction => {
      const attempt =
        await db.NotificacionEnvio.findByPk(
          envioId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        );

      // El intento debe pertenecer al usuario autenticado.
      const recipient = attempt
        ? await db.NotificacionUsuario.findOne({
          where: {
            id_notificacion_usuario:
              attempt.id_notificacion_usuario,

            id_usuario: userId,
          },

          attributes: [
            'id_notificacion_usuario',
          ],

          transaction,
        })
        : null;

      const supplied = createHash('sha256')
        .update(prueba)
        .digest('hex');

      const stored = attempt?.hash_confirmacion;

      if (
        !recipient ||
        typeof stored !== 'string' ||
        !/^[0-9a-f]{64}$/.test(stored) ||
        !timingSafeEqual(
          Buffer.from(stored, 'hex'),
          Buffer.from(supplied, 'hex'),
        )
      ) {
        throw new AppError(
          'No se encontró un intento confirmable.',
          404,
          'RECEIPT_NOT_FOUND',
        );
      }

      const duplicada = Boolean(attempt.fecha_recepcion_app);

      if (!duplicada) {
        await attempt.update(
          {
            fecha_recepcion_app: new Date(),
            contexto_recepcion: contexto,
          },
          {
            transaction,
            hooks: false,
          },
        );
      }

      // No alterar estado_envio, fecha_envio ni messageId:
      // esos campos representan la respuesta de Firebase.
      return {
        id_envio: envioId,

        duplicada,

        fecha_recepcion_app: attempt.fecha_recepcion_app,

        contexto: attempt.contexto_recepcion,
      };
    },
  );
};

module.exports = confirmarRecepcionService;