// services/get-unread-count.service.js

const { Op } = require('sequelize');
const db = require('../../../../database/models');

// Validations
const { validateId } = require('../../validations/notificacion.validation');

// Modelos
const { NotificacionUsuario } = db;

// =======================================================
// Service: Obtener notificacion no leidas
// =======================================================
const getUnreadCountService = async (idUsuario) => {
  const userId =
    validateId(
      idUsuario,
      'identificador del usuario',
    );

  const now = new Date();

  const total =
    await NotificacionUsuario
      .count({
        where: {
          id_usuario:
            userId,

          leida:
            false,

          archivada:
            false,
        },

        include: [
          {
            association:
              'notificacion',

            required:
              true,

            where: {
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
            },
          },
        ],
      });

  return {
    total_no_leidas:
      total,
  };
};

module.exports = getUnreadCountService;