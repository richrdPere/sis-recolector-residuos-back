const db = require("../../../database/models");

// Models
const { Usuario } = db;

// Validations
const { validarUsuarioSelector } = require("../validations/usuario.validation");

// Utils
const {
  USUARIO_ATTRIBUTES,
  crearIncludePersona,
  construirWhereUsuarios,
  completarUsuariosConRoles,
} = require("../utils/usuario-service.utils");

// *********************************************************
// SERVICE: SELECTOR DE USUARIOS ACTIVOS
// *********************************************************
const getUsuariosSelectorService = async (params = {}) => {
  const filtros = validarUsuarioSelector(params);

  const usuarios = await Usuario.findAll({
    attributes: USUARIO_ATTRIBUTES,

    where: construirWhereUsuarios({
      ...filtros,
      estado: true,
    }),

    include: [
      crearIncludePersona({ soloActivos: true }),
    ],

    limit: filtros.limit,

    order: [
      [{ model: db.Persona, as: "persona" }, "apellidos", "ASC"],
      [{ model: db.Persona, as: "persona" }, "nombres", "ASC"],
      ["id_usuario", "ASC"],
    ],

    subQuery: false,
  });

  const items = await completarUsuariosConRoles(usuarios, {
    estadoAsignacion: true,
    soloRolesActivos: true,
  });

  return items.map((usuario) => {
    const persona = usuario.persona;

    const nombreCompleto = [
      persona.nombres,
      persona.apellidos,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      id_usuario: usuario.id_usuario,
      id_persona: usuario.id_persona,
      username: usuario.username,
      email_acceso: usuario.email_acceso,
      nombre_completo: nombreCompleto,
      tipo_documento: persona.tipo_documento,
      numero_documento: persona.numero_documento,
      foto_url: persona.foto_url,

      label: `${nombreCompleto} (${usuario.username})`,

      roles: usuario.roles.map((rol) => ({
        id_rol: rol.id_rol,
        nombre: rol.nombre,
      })),
    };
  });
};

module.exports = getUsuariosSelectorService;