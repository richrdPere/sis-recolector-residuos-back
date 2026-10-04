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
// SERVICE: REMOVER / DESACTIVAR ROL
// *********************************************************
const removeUsuarioRolService = async (params) => {
  const { id_usuario, id_rol } = validarOperacionRol(params);

  return sequelize.transaction(async (transaction) => {
    await obtenerUsuarioExistente(id_usuario, {
      transaction,
      lock: true,
    });

    // Permite limpiar asignaciones de roles eliminados.
    const rol = await obtenerRolExistente(id_rol, {
      transaction,
      lock: true,
      incluirEliminados: true,
    });

    const asignacion = await UsuarioRol.findOne({
      where: { id_usuario, id_rol },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!asignacion) {
      throw crearHttpError(
        "El usuario no tiene una asignación para este rol.",
        404
      );
    }

    if (!asignacion.estado) {
      return construirRespuestaAsignacion(
        asignacion,
        rol,
        false
      );
    }

    await asignacion.update(
      { estado: false },
      { transaction }
    );

    return construirRespuestaAsignacion(
      asignacion,
      rol,
      true
    );
  });
};


module.exports = removeUsuarioRolService;