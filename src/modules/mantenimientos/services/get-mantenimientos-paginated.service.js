const db = require('../../../database/models');

// Utils
const {
  CAMPOS_ORDENAMIENTO,
  error,
  enteroQuery,
  construirFiltros,
} = require("../utils/mantenimientos.utils");

// Modelos
const {
  Vehiculo,
  VehiculoMantenimiento,
} = db;


// *********************************************************
// SERVICE: LISTAR MANTENIMIENTOS PAGINADO
// *********************************************************

const getMantenimientosPaginatedService = async (
  query = {},
) => {
  const page = enteroQuery(
    query.page,
    1,
    'page',
  );

  const limit = enteroQuery(
    query.limit,
    20,
    'limit',
    100,
  );

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    error('La página solicitada excede el límite permitido.');
  }

  const sortBy = query.sort_by ??
    'fecha_inicio_programada';

  const sortOrder = query.sort_order ?? 'DESC';

  if (!CAMPOS_ORDENAMIENTO.includes(sortBy)) {
    error('El campo de ordenamiento no es válido.');
  }

  if (!['ASC', 'DESC'].includes(sortOrder)) {
    error('El sentido del ordenamiento no es válido.');
  }

  const { count, rows } =
    await VehiculoMantenimiento.findAndCountAll({
      where: construirFiltros(query),

      include: [
        {
          model: Vehiculo,
          as: 'vehiculo',
          paranoid: false,

          attributes: [
            'id_vehiculo',
            'codigo',
            'placa',
            'estado_operativo',
          ],
        },
      ],

      limit,
      offset,

      order: [
        [sortBy, sortOrder],
        ['id_mantenimiento', 'DESC'],
      ],
    });

  return {
    items: rows.map((item) => item.toJSON()),

    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit),
    },
  };
};


module.exports = getMantenimientosPaginatedService;