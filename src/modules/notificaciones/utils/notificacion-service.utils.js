const db =
  require('../../../database/models');

const AppError =
  require(
    '../../../utils/app-error',
  );

const {
  Notificacion,
  NotificacionUsuario,
} = db;

const getNotificationDetail =
  async (
    idNotificacion,
    {
      transaction = null,
    } = {},
  ) => {
    return Notificacion.findByPk(
      idNotificacion,
      {
        include: [
          {
            association:
              'creador',

            attributes: [
              'id_usuario',
              'username',
              'email_acceso',
            ],

            required:
              false,
          },
          {
            association:
              'destinatarios',

            include: [
              {
                association:
                  'destinatario',

                attributes: [
                  'id_usuario',
                  'username',
                  'email_acceso',
                ],
              },
            ],
          },
        ],

        transaction,
      },
    );
  };

const getUserNotificationOrFail =
  async ({
    id_notificacion_usuario,
    id_usuario,
    transaction = null,
    lock = false,
  }) => {
    const options = {
      where: {
        id_notificacion_usuario,
        id_usuario,
      },

      include: [
        {
          association:
            'notificacion',
        },
      ],

      transaction,
    };

    if (
      transaction &&
      lock
    ) {
      options.lock =
        transaction.LOCK.UPDATE;
    }

    const userNotification =
      await NotificacionUsuario
        .findOne(
          options,
        );

    if (!userNotification) {
      throw new AppError(
        'La notificación no fue encontrada para el usuario autenticado.',
        404,
        'USER_NOTIFICATION_NOT_FOUND',
      );
    }

    return userNotification;
  };

module.exports = {
  getNotificationDetail,
  getUserNotificationOrFail,
};