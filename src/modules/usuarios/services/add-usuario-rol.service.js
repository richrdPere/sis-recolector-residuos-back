const db = require("../../../database/models");

// Models
const {
  sequelize,
  UsuarioRol,
} = db;

// Validations
const {
  crearHttpError,
  validarOperacionRol,
} = require("../validations/usuario.validation");

// Utils
const {
  obtenerUsuarioExistente,
  obtenerRolExistente,
  construirRespuestaAsignacion,
} = require("../utils/usuario-service.utils");


// *********************************************************
// SERVICE: AGREGAR / REACTIVAR ROL
// *********************************************************
const addUsuarioRolService = async (params) => {
  const { id_usuario, id_rol } = validarOperacionRol(params);

  return sequelize.transaction(async (transaction) => {
    // Todas las mutaciones de roles bloquean primero al usuario.
    const usuario = await obtenerUsuarioExistente(id_usuario, {
      transaction,
      lock: true,
    });

    if (!usuario.estado) {
      throw crearHttpError(
        "No se pueden asignar roles a un usuario inactivo.",
        409
      );
    }

    const rol = await obtenerRolExistente(id_rol, {
      transaction,
      lock: true,
    });

    if (!rol.estado) {
      throw crearHttpError(
        "No se puede asignar un rol inactivo.",
        409
      );
    }

    let asignacion = await UsuarioRol.findOne({
      where: { id_usuario, id_rol },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (asignacion?.estado) {
      return construirRespuestaAsignacion(
        asignacion,
        rol,
        false
      );
    }

    if (asignacion) {
      // Reutiliza la fila para respetar uq_usuario_rol.
      await asignacion.update(
        { estado: true },
        { transaction }
      );
    } else {
      asignacion = await UsuarioRol.create(
        {
          id_usuario,
          id_rol,
          estado: true,
        },
        { transaction }
      );
    }

    return construirRespuestaAsignacion(
      asignacion,
      rol,
      true
    );
  });
};


module.exports = addUsuarioRolService;