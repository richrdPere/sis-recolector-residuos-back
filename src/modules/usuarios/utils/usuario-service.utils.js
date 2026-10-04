const { Op } = require("sequelize");
const db = require("../../../database/models");

const {
  sequelize,
  Usuario,
  Persona,
  UsuarioRol,
  Roles,
} = db;

const { crearHttpError } = require("../validations/usuario.validation");

const USUARIO_ATTRIBUTES = [
  "id_usuario",
  "id_persona",
  "email_acceso",
  "username",
  "estado",
  "ultimo_acceso",
  "created_at",
  "updated_at",
];

const PERSONA_ATTRIBUTES = [
  "id_persona",
  "nombres",
  "apellidos",
  "email_contacto",
  "tipo_documento",
  "numero_documento",
  "fecha_nacimiento",
  "celular",
  "direccion",
  "foto_url",
  "genero",
  "estado",
  "createdAt",
  "updatedAt",
];

const ROL_ATTRIBUTES = [
  "id_rol",
  "nombre",
  "descripcion",
  "estado",
];

const crearIncludePersona = ({ soloActivos = false } = {}) => ({
  model: Persona,
  as: "persona",
  attributes: PERSONA_ATTRIBUTES,
  required: true,
  ...(soloActivos ? { where: { estado: true } } : {}),
});

const construirWhereUsuarios = ({
  search = "",
  estado,
  id_rol,
}) => {
  const condiciones = [];

  if (estado !== undefined) {
    condiciones.push({ estado });
  }

  if (search) {
    const pattern = `%${search}%`;

    condiciones.push({
      [Op.or]: [
        { username: { [Op.like]: pattern } },
        { email_acceso: { [Op.like]: pattern } },
        { "$persona.nombres$": { [Op.like]: pattern } },
        { "$persona.apellidos$": { [Op.like]: pattern } },
        {
          "$persona.numero_documento$": {
            [Op.like]: pattern,
          },
        },
      ],
    });
  }

  if (id_rol !== undefined) {
    // id_rol llega validado y también se escapa.
    // El filtro exige asignación activa y rol vigente.
    condiciones.push(
      sequelize.literal(`
        EXISTS (
          SELECT 1
          FROM usuario_roles AS ur
          INNER JOIN roles AS r
            ON r.id_rol = ur.id_rol
          WHERE ur.id_usuario = Usuario.id_usuario
            AND ur.id_rol = ${sequelize.escape(id_rol)}
            AND ur.estado = 1
            AND r.estado = 1
            AND r.deleted_at IS NULL
        )
      `)
    );
  }

  return condiciones.length
    ? { [Op.and]: condiciones }
    : {};
};

const obtenerUsuarioExistente = async (
  idUsuario,
  { transaction, lock = false } = {}
) => {
  const usuario = await Usuario.findByPk(idUsuario, {
    attributes: USUARIO_ATTRIBUTES,
    transaction,
    ...(transaction && lock
      ? { lock: transaction.LOCK.UPDATE }
      : {}),
  });

  if (!usuario) {
    throw crearHttpError("Usuario no encontrado.", 404);
  }

  return usuario;
};

const obtenerRolExistente = async (
  idRol,
  {
    transaction,
    lock = false,
    incluirEliminados = false,
  } = {}
) => {
  const rol = await Roles.findByPk(idRol, {
    attributes: ROL_ATTRIBUTES,
    paranoid: !incluirEliminados,
    transaction,
    ...(transaction && lock
      ? { lock: transaction.LOCK.UPDATE }
      : {}),
  });

  if (!rol) {
    throw crearHttpError("Rol no encontrado.", 404);
  }

  return rol;
};

const obtenerRolesPorUsuarios = async (
  usuariosIds,
  {
    estadoAsignacion,
    soloRolesActivos = false,
    transaction,
  } = {}
) => {
  const mapa = new Map(
    usuariosIds.map((id) => [String(id), []])
  );

  if (!usuariosIds.length) return mapa;

  const where = {
    id_usuario: { [Op.in]: usuariosIds },
  };

  if (estadoAsignacion !== undefined) {
    where.estado = estadoAsignacion;
  }

  const asignaciones = await UsuarioRol.findAll({
    attributes: [
      "id_usuario_rol",
      "id_usuario",
      "id_rol",
      "estado",
      "created_at",
    ],
    where,
    order: [["id_usuario_rol", "ASC"]],
    transaction,
  });

  if (!asignaciones.length) return mapa;

  const rolesIds = [
    ...new Set(
      asignaciones.map((item) => String(item.id_rol))
    ),
  ];

  const roles = await Roles.findAll({
    attributes: ROL_ATTRIBUTES,
    where: {
      id_rol: { [Op.in]: rolesIds },
      ...(soloRolesActivos ? { estado: true } : {}),
    },
    transaction,
  });

  const rolesMap = new Map(
    roles.map((rol) => [
      String(rol.id_rol),
      rol.get({ plain: true }),
    ])
  );

  for (const asignacion of asignaciones) {
    const rol = rolesMap.get(String(asignacion.id_rol));

    // Roles eliminados lógicamente no se exponen.
    if (!rol) continue;

    mapa.get(String(asignacion.id_usuario))?.push({
      ...rol,
      id_usuario_rol: asignacion.id_usuario_rol,
      estado_asignacion: asignacion.estado,
      fecha_asignacion: asignacion.created_at,
    });
  }

  return mapa;
};

const completarUsuariosConRoles = async (
  usuarios,
  opciones = {}
) => {
  const rolesMap = await obtenerRolesPorUsuarios(
    usuarios.map((usuario) => usuario.id_usuario),
    opciones
  );

  return usuarios.map((usuario) => ({
    ...usuario.get({ plain: true }),
    roles: rolesMap.get(String(usuario.id_usuario)) ?? [],
  }));
};

const construirPaginacion = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    total_pages: totalPages,
    has_next_page: page < totalPages,
    has_previous_page: page > 1 && totalPages > 0,
  };
};

const construirRespuestaAsignacion = (asignacion, rol, changed) => ({
  id_usuario_rol: asignacion.id_usuario_rol,
  id_usuario: asignacion.id_usuario,
  id_rol: asignacion.id_rol,
  estado: asignacion.estado,
  created_at: asignacion.created_at,
  changed,
  rol: rol.get({ plain: true }),
});

module.exports = {
  USUARIO_ATTRIBUTES,
  crearIncludePersona,
  construirWhereUsuarios,
  obtenerUsuarioExistente,
  obtenerRolExistente,
  obtenerRolesPorUsuarios,
  completarUsuariosConRoles,
  construirPaginacion,
  construirRespuestaAsignacion,
};