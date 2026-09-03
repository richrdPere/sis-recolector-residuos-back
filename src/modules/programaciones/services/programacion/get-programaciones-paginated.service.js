const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Utils 
const { validateId } = require("../../utils/programacion-service.utils");

// Modelos
const { ProgramacionRuta } = db;

// ===============================================
// SERVICE: Obtener programaciones paginado
// ===============================================
const getProgramacionesPaginatedService = async ({
  page = 1,
  limit = 10,
  search = '',
  fecha_desde,
  fecha_hasta,
  estado_programacion,
  id_ruta,
  id_vehiculo,
}) => {
  const currentPage =
    Number(page);

  const currentLimit =
    Number(limit);

  if (
    !Number.isInteger(
      currentPage,
    ) ||
    currentPage < 1 ||
    !Number.isInteger(
      currentLimit,
    ) ||
    currentLimit < 1 ||
    currentLimit > 100
  ) {
    throw new AppError(
      'Los parámetros de paginación no son válidos.',
      400,
      'INVALID_PAGINATION',
    );
  }

  const where = {};

  if (
    fecha_desde ||
    fecha_hasta
  ) {
    where.fecha_programada =
      {};

    if (fecha_desde) {
      where.fecha_programada[
        Op.gte
      ] = fecha_desde;
    }

    if (fecha_hasta) {
      where.fecha_programada[
        Op.lte
      ] = fecha_hasta;
    }
  }

  if (estado_programacion) {
    where.estado_programacion =
      estado_programacion;
  }

  if (id_ruta) {
    where.id_ruta =
      validateId(
        id_ruta,
        'identificador de la ruta',
      );
  }

  if (id_vehiculo) {
    where.id_vehiculo =
      validateId(
        id_vehiculo,
        'identificador del vehículo',
      );
  }

  const searchValue =
    String(search || '')
      .trim();

  if (searchValue) {
    where[Op.or] = [
      {
        '$ruta.nombre$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$ruta.codigo$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$vehiculo.placa$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
      {
        '$vehiculo.codigo$': {
          [Op.like]:
            `%${searchValue}%`,
        },
      },
    ];
  }

  const {
    count,
    rows,
  } =
    await ProgramacionRuta
      .findAndCountAll({
        where,

        include: [
          {
            association:
              'ruta',

            attributes: [
              'id_ruta',
              'codigo',
              'nombre',
            ],
          },
          {
            association:
              'version_ruta',

            attributes: [
              'id_ruta_version',
              'numero_version',
            ],
          },
          {
            association:
              'vehiculo',

            attributes: [
              'id_vehiculo',
              'codigo',
              'placa',
              'marca',
              'modelo',
            ],
          },
          {
            association:
              'personal_asignado',

            attributes: [
              'id_programacion_personal',
              'funcion',
              'es_principal',
              'estado_asignacion',
            ],

            include: [
              {
                association:
                  'personal',

                attributes: [
                  'id_personal',
                  'codigo_empleado',
                ],

                include: [
                  {
                    association:
                      'usuario',

                    attributes: [
                      'id_usuario',
                      'username',
                    ],

                    include: [
                      {
                        association:
                          'persona',

                        attributes: [
                          'nombres',
                          'apellidos',
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],

        distinct: true,
        subQuery: false,

        limit: currentLimit,

        offset:
          (
            currentPage - 1
          ) * currentLimit,

        order: [
          [
            'fecha_programada',
            'DESC',
          ],
          [
            'hora_inicio_programada',
            'ASC',
          ],
        ],
      });

  const totalPages =
    Math.ceil(
      count / currentLimit,
    );

  return {
    items: rows,

    pagination: {
      total: count,
      page: currentPage,
      limit: currentLimit,
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

module.exports = getProgramacionesPaginatedService;