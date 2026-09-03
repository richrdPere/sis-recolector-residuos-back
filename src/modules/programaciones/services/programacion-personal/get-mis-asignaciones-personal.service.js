const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  PersonalOperativo,
} = db;


// ===============================================
// SERVICE: Obtener mis asignaciones
// ===============================================
const getMisAsignacionesService = async ({
  id_usuario,
  page = 1,
  limit = 10,
}) => {
  const personal =
    await PersonalOperativo
      .findOne({
        where: {
          id_usuario,
          estado: true,
        },
      });

  if (!personal) {
    throw new AppError(
      'El usuario no tiene un perfil laboral activo.',
      403,
      'USER_WITHOUT_ACTIVE_PERSONAL_PROFILE',
    );
  }

  const currentPage =
    Number(page);

  const currentLimit =
    Number(limit);

  const {
    count,
    rows,
  } =
    await ProgramacionPersonal
      .findAndCountAll({
        where: {
          id_personal:
            personal.id_personal,
        },

        include: [
          {
            association:
              'programacion',

            include: [
              {
                association:
                  'ruta',
              },
              {
                association:
                  'version_ruta',
              },
              {
                association:
                  'vehiculo',
              },
            ],
          },
        ],

        limit: currentLimit,

        offset:
          (
            currentPage - 1
          ) * currentLimit,

        order: [
          [
            {
              model:
                ProgramacionRuta,

              as:
                'programacion',
            },
            'fecha_programada',
            'DESC',
          ],
        ],
      });

  return {
    items: rows,

    pagination: {
      total: count,
      page: currentPage,
      limit: currentLimit,

      total_pages:
        Math.ceil(
          count /
          currentLimit,
        ),
    },
  };
};

module.exports = getMisAsignacionesService;