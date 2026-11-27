const { Op } = require('sequelize');

const db = require('../database/models');
const AppError = require('../utils/app-error');

async function obtenerRoles(idUsuario, soloActivos = false) {
  const relaciones = await db.UsuarioRol.findAll({
    where: {
      id_usuario: idUsuario,
      estado: true,
    },
    attributes: ['id_rol'],
    raw: true,
  });

  if (!relaciones.length) {
    return [];
  }

  const roles = await db.Roles.findAll({
    where: {
      id_rol: {
        [Op.in]: relaciones.map((relacion) => relacion.id_rol),
      },

      ...(soloActivos ? { estado: true } : {}),
    },
    attributes: ['nombre'],
    raw: true,
  });

  return roles.map((rol) =>
    String(rol.nombre).trim().toUpperCase(),
  );
}

module.exports = async function protegerGestionUsuarios(req, res, next) {
  try {
    const actorId = req.usuario?.id_usuario;

    if (!actorId) {
      throw new AppError('Debes iniciar sesión.', 401);
    }

    const actor = await db.Usuario.findByPk(actorId);

    if (!actor || !actor.estado) {
      throw new AppError(
        'La cuenta no está habilitada.',
        403,
      );
    }

    // Consultar permisos actuales en la base de datos.
    const roles = await obtenerRoles(actorId, true);

    if (roles.includes('SUPER_ADMIN')) {
      return next();
    }

    if (!roles.includes('ADMIN')) {
      throw new AppError(
        'No tienes permisos para administrar cuentas.',
        403,
      );
    }

    const destino =
      req.params.id_usuario ??
      req.params.idUsuario;

    // ADMIN no puede modificar una cuenta SUPER_ADMIN.
    if (destino != null) {
      if (!/^[1-9]\d*$/.test(String(destino))) {
        throw new AppError(
          'Identificador de usuario no válido.',
          400,
        );
      }

      const rolesDestino = await obtenerRoles(destino);

      if (rolesDestino.includes('SUPER_ADMIN')) {
        throw new AppError(
          'Solo SUPER_ADMIN puede modificar esta cuenta.',
          403,
        );
      }
    }

    // Comprobar los roles solicitados durante la creación.
    const solicitados = [
      ...(
        Array.isArray(req.body?.roles_ids)
          ? req.body.roles_ids
          : []
      ),

      ...(
        req.body?.id_rol != null
          ? [req.body.id_rol]
          : []
      ),
    ];

    if (solicitados.length) {
      if (
        solicitados.some(
          (id) => !/^[1-9]\d*$/.test(String(id)),
        )
      ) {
        throw new AppError(
          'Los identificadores de roles no son válidos.',
          400,
        );
      }

      const rolesSolicitados = await db.Roles.findAll({
        where: {
          id_rol: {
            [Op.in]: solicitados,
          },
        },
        attributes: ['nombre'],
        raw: true,
      });

      const solicitaSuperAdmin = rolesSolicitados.some(
        (rol) =>
          String(rol.nombre).trim().toUpperCase() ===
          'SUPER_ADMIN',
      );

      if (solicitaSuperAdmin) {
        throw new AppError(
          'Solo SUPER_ADMIN puede asignar este rol.',
          403,
        );
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};