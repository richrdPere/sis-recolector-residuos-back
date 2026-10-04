// Validations
const { validarUsuarioRoles } = require("../validations/usuario.validation");

// Utils
const {
  obtenerUsuarioExistente,
  obtenerRolesPorUsuarios,
} = require("../utils/usuario-service.utils");

// *********************************************************
// 6. ROLES DE UN USUARIO
// *********************************************************
const getUsuarioRolesService = async (params = {}) => {
  const { id_usuario, estado } = validarUsuarioRoles(params);

  const usuario = await obtenerUsuarioExistente(id_usuario);

  const rolesMap = await obtenerRolesPorUsuarios(
    [id_usuario],
    { estadoAsignacion: estado }
  );

  const roles = rolesMap.get(String(id_usuario)) ?? [];

  return {
    id_usuario: usuario.id_usuario,
    username: usuario.username,
    estado_usuario: usuario.estado,
    roles,
    total: roles.length,

    filters: {
      estado: estado ?? null,
    },
  };
};

module.exports = getUsuarioRolesService;