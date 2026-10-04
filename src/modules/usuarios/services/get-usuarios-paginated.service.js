const db = require("../../../database/models");

// Models
const {
  sequelize,
  Usuario,
  UsuarioRol,
} = db;

// Validations
const { validarUsuariosPaginados } = require("../validations/usuario.validation");

// Utils
const {
  USUARIO_ATTRIBUTES,
  crearIncludePersona,
  construirWhereUsuarios,
  completarUsuariosConRoles,
  construirPaginacion,
} = require("../utils/usuario-service.utils");


// *********************************************************
// SERVICE: USUARIOS PAGINADOS
// *********************************************************
const getUsuariosPaginatedService = async (params = {}) => {
  const filtros = validarUsuariosPaginados(params);

  const order = [
    [filtros.sort_by, filtros.sort_order],
  ];

  // Desempate estable para registros con el mismo valor.
  if (filtros.sort_by !== "id_usuario") {
    order.push(["id_usuario", filtros.sort_order]);
  }

  const { count, rows } = await Usuario.findAndCountAll({
    attributes: USUARIO_ATTRIBUTES,

    where: construirWhereUsuarios(filtros),

    include: [crearIncludePersona()],

    limit: filtros.limit,
    offset: filtros.offset,
    order,

    // Solo existe un join N:1 con Persona.
    // Los roles se consultan posteriormente por lote.
    subQuery: false,
    distinct: true,
  });

  const items = await completarUsuariosConRoles(rows);

  return {
    items,

    pagination: construirPaginacion({
      total: count,
      page: filtros.page,
      limit: filtros.limit,
    }),

    filters: {
      search: filtros.search,
      estado: filtros.estado ?? null,
      id_rol: filtros.id_rol ?? null,
      sort_by: filtros.sort_by,
      sort_order: filtros.sort_order,
    },
  };
};


module.exports = getUsuariosPaginatedService;