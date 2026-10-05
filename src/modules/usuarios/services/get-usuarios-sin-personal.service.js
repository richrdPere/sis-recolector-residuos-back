const { Op } = require("sequelize");
const db = require("../../../database/models");

// Models
const { Usuario, Persona, sequelize } = db;

// Validations
const {
  validarUsuarioSelector,
} = require("../validations/usuario.validation");

// Utils
const {
  USUARIO_ATTRIBUTES,
  crearIncludePersona,
  construirWhereUsuarios,
  completarUsuariosConRoles,
} = require("../utils/usuario-service.utils");

// *********************************************************
// SERVICE: USUARIOS DISPONIBLES PARA CREAR PERSONAL OPERATIVO
// *********************************************************
const getUsuariosSinPersonalService = async (params = {}) => {
  const filtros = validarUsuarioSelector(params);

  const usuarios = await Usuario.findAll({
    attributes: USUARIO_ATTRIBUTES,

    where: {
      [Op.and]: [
        // Mantiene búsqueda, filtro por rol y usuario activo.
        construirWhereUsuarios({
          ...filtros,
          estado: true,
        }),

        // Excluye cualquier perfil laboral existente.
        // Incluye deshabilitados y eliminados lógicamente,
        // porque id_usuario continúa siendo único.
        sequelize.literal(`
          NOT EXISTS (
            SELECT 1
            FROM personal_operativo AS po
            WHERE po.id_usuario = Usuario.id_usuario
          )
        `),

        // Excluye usuarios con el rol CIUDADANO asignado.
        sequelize.literal(`
          NOT EXISTS (
            SELECT 1
            FROM usuario_roles AS ur
            INNER JOIN roles AS r
              ON r.id_rol = ur.id_rol
            WHERE ur.id_usuario = Usuario.id_usuario
              AND ur.estado = 1
              AND r.nombre = 'CIUDADANO'
              AND r.deleted_at IS NULL
          )
        `),
      ],
    },

    include: [
      crearIncludePersona({ soloActivos: true }),
    ],

    limit: filtros.limit,

    order: [
      [{ model: Persona, as: "persona" }, "apellidos", "ASC"],
      [{ model: Persona, as: "persona" }, "nombres", "ASC"],
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

module.exports = getUsuariosSinPersonalService;