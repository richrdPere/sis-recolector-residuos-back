const { Op } = require('sequelize');
const db = require('../../../database/models');

// Modelos
const { Incidencia } = db;

// Validations
const { validarPaginadoIncidencias } = require('../validations/incidencia.validations');

// Utils
const {
  construirWhereIncidencias,
  construirIncludesIncidencia,
  paginacion,
} = require('../utils/incidencia.utils');

const {
  validateActor,
  authorizeIncidencia,
  getIncidenciasScope,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: LISTADO PAGINADO
// ==========================================================

const getIncidenciasPaginadoService = async (
  query,
  metadata,
) => {
  const filtros = validarPaginadoIncidencias(query);
  const actor = validateActor(metadata);

  await authorizeIncidencia('listar', actor, {
    filtros,
  });

  const alcance = await getIncidenciasScope(actor);

  const where = {
    [Op.and]: [
      alcance,
      construirWhereIncidencias(filtros, Op),
    ],
  };

  const order = [
    [
      filtros.sort_by,
      filtros.sort_order,
    ],
  ];

  if (filtros.sort_by !== 'id_incidencia') {
    order.push([
      'id_incidencia',
      filtros.sort_order,
    ]);
  }

  const { count, rows } =
    await Incidencia.findAndCountAll({
      where,

      include: construirIncludesIncidencia(false),

      distinct: true,
      col: 'id_incidencia',

      order,
      limit: filtros.limit,
      offset: (filtros.page - 1) * filtros.limit,
    });

  return {
    items: rows.map((incidencia) =>
      incidencia.get({ plain: true }),
    ),

    pagination: paginacion(
      count,
      filtros.page,
      filtros.limit,
    ),
  };
};

module.exports = getIncidenciasPaginadoService;