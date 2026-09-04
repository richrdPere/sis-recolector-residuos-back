const { Op } = require('sequelize');
const db = require('../../../../database/models');

// Validations
const {
  validateId,
  normalizeBooleanQuery,
  normalizePriority,
} = require('../../validations/notificacion.validation');

// Modelos
const {
  NotificacionUsuario,
} = db;

// =======================================================
// Service: Obtener mis notificaciones
// =======================================================
const getMyNotificationsService = async ({
  id_usuario,
  page = 1,
  limit = 20,
  leida = null,
  archivada = false,
  tipo_notificacion = null,
  prioridad = null,
  search = null,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const parsedPage =
    Number.parseInt(
      page,
      10,
    );

  const parsedLimit =
    Number.parseInt(
      limit,
      10,
    );

  const currentPage =
    Number.isInteger(
      parsedPage,
    ) &&
      parsedPage > 0
      ? parsedPage
      : 1;

  const currentLimit =
    Number.isInteger(
      parsedLimit,
    ) &&
      parsedLimit > 0
      ? Math.min(
        parsedLimit,
        100,
      )
      : 20;

  const whereRecipient = {
    id_usuario:
      userId,

    archivada:
      normalizeBooleanQuery(
        archivada,
        'archivada',
      ) ??
      false,
  };

  const readFilter =
    normalizeBooleanQuery(
      leida,
      'leída',
    );

  if (
    readFilter !== null
  ) {
    whereRecipient.leida =
      readFilter;
  }

  const now =
    new Date();

  const whereNotification = {
    enviar_interna:
      true,

    estado_notificacion: {
      [Op.notIn]: [
        'BORRADOR',
        'CANCELADA',
      ],
    },

    [Op.and]: [
      {
        [Op.or]: [
          {
            fecha_programada:
              null,
          },
          {
            fecha_programada: {
              [Op.lte]:
                now,
            },
          },
        ],
      },
      {
        [Op.or]: [
          {
            fecha_expiracion:
              null,
          },
          {
            fecha_expiracion: {
              [Op.gt]:
                now,
            },
          },
        ],
      },
    ],
  };

  if (tipo_notificacion) {
    whereNotification
      .tipo_notificacion =
      String(
        tipo_notificacion,
      )
        .trim()
        .toUpperCase();
  }

  if (prioridad) {
    whereNotification.prioridad =
      normalizePriority(
        prioridad,
      );
  }

  const normalizedSearch =
    String(
      search || '',
    ).trim();

  if (normalizedSearch) {
    whereNotification[
      Op.or
    ] = [
        {
          titulo: {
            [Op.like]:
              `%${normalizedSearch}%`,
          },
        },
        {
          mensaje: {
            [Op.like]:
              `%${normalizedSearch}%`,
          },
        },
      ];
  }

  const {
    rows,
    count,
  } =
    await NotificacionUsuario
      .findAndCountAll({
        where:
          whereRecipient,

        include: [
          {
            association:
              'notificacion',

            where:
              whereNotification,

            required:
              true,

            include: [
              {
                association:
                  'creador',

                attributes: [
                  'id_usuario',
                  'username',
                ],

                required:
                  false,
              },
            ],
          },
        ],

        distinct:
          true,

        order: [
          [
            'created_at',
            'DESC',
          ],
          [
            'id_notificacion_usuario',
            'DESC',
          ],
        ],

        limit:
          currentLimit,

        offset:
          (
            currentPage -
            1
          ) *
          currentLimit,
      });

  const totalPages =
    count > 0
      ? Math.ceil(
        count /
        currentLimit,
      )
      : 0;

  return {
    items:
      rows,

    pagination: {
      page:
        currentPage,

      limit:
        currentLimit,

      total:
        count,

      total_pages:
        totalPages,

      has_next_page:
        currentPage <
        totalPages,

      has_previous_page:
        currentPage > 1,
    },
  };
};

module.exports = getMyNotificationsService;