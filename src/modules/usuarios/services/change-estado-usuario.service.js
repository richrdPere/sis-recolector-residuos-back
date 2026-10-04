const db = require("../../../database/models");

const { sequelize } = db;

// Validations
const {
  crearHttpError,
  validarId,
  validarBooleano,
} = require("../validations/usuario.validation");

// Utils
const { obtenerUsuarioExistente } = require("../utils/usuario-service.utils");

// *********************************************************
// SERVICE: CAMBIAR ESTADO DEL USUARIO
// *********************************************************
const changeEstadoUsuarioService = async (params = {}) => {
  if (
    !params ||
    typeof params !== "object" ||
    Array.isArray(params)
  ) {
    throw crearHttpError("Los parámetros deben ser un objeto.");
  }

  const idUsuario = validarId(
    params.id_usuario,
    "id_usuario",
  );

  const estado = validarBooleano(
    params.estado,
    "estado",
    undefined,
  );

  if (estado === undefined) {
    throw crearHttpError("El estado del usuario es obligatorio.");
  }

  return sequelize.transaction(async (transaction) => {
    const usuario = await obtenerUsuarioExistente(
      idUsuario,
      {
        transaction,
        lock: true,
      },
    );

    const changed = Boolean(usuario.estado) !== estado;

    if (changed) {
      await usuario.update(
        { estado },
        { transaction },
      );
    }

    return {
      id_usuario: usuario.id_usuario,
      estado: Boolean(usuario.estado),
      updated_at: usuario.updated_at,
      changed,
    };
  });
};

module.exports = changeEstadoUsuarioService;