const { Op } = require('sequelize');
const db = require('../../../../database/models');

// Validation
const { validateId } = require('../../validations/dispositivo.validation');

// Modelos
const {
  UsuarioDispositivo,
} = db;

/*
|--------------------------------------------------------------------------
| Obtener dispositivos habilitados para push
|--------------------------------------------------------------------------
|
| Este servicio es de uso interno. No debe exponerse directamente mediante
| un controller porque contiene los tokens FCM.
|
*/

const getPushDevicesService = async ({
  userIds,
  plataformas = null,
  transaction = null,
}) => {
  if (
    !Array.isArray(userIds) ||
    !userIds.length
  ) {
    return [];
  }

  const normalizedUserIds = [
    ...new Set(
      userIds.map(
        (idUsuario) =>
          validateId(
            idUsuario,
            'identificador del usuario',
          ),
      ),
    ),
  ];

  const where = {
    id_usuario: {
      [Op.in]:
        normalizedUserIds,
    },

    permiso_notificaciones:
      true,

    estado_dispositivo:
      'ACTIVO',

    token_push: {
      [Op.and]: [
        {
          [Op.ne]: null,
        },
        {
          [Op.ne]: '',
        },
      ],
    },
  };

  if (
    Array.isArray(
      plataformas,
    ) &&
    plataformas.length
  ) {
    where.plataforma = {
      [Op.in]:
        plataformas.map(
          (plataforma) =>
            String(
              plataforma,
            )
              .trim()
              .toUpperCase(),
        ),
    };
  }

  return UsuarioDispositivo
    .findAll({
      where,

      attributes: [
        'id_dispositivo',
        'id_usuario',
        'token_push',
        'plataforma',
        'identificador_dispositivo',
        'nombre_dispositivo',
        'fecha_ultima_actividad',
      ],

      order: [
        [
          'fecha_ultima_actividad',
          'DESC',
        ],
      ],

      transaction,
    });
};

module.exports = getPushDevicesService;