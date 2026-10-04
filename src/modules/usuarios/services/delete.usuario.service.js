const db = require("../../../database/models");

// Modelos
const {
  sequelize,
  UsuarioRol,
} = db;

// Validations
const { validarId } = require("../validations/usuario.validation");

// Utils
const { obtenerUsuarioExistente } = require("../utils/usuario-service.utils");

const {
  validarObjeto,
  validarCampos,
  revocarSesionesUsuario,
} = require("../utils/usuario-write.utils");

// *********************************************************
// SERVICE: ELIMINAR USUARIO
// *********************************************************
const deleteUsuarioService = async (params = {}) => {
  validarObjeto(params, "Los parámetros");

  validarCampos(
    params,
    ["id_usuario"],
    "Eliminación de usuario"
  );

  const idUsuario = validarId(
    params.id_usuario,
    "id_usuario"
  );

  return sequelize.transaction(async (transaction) => {
    const usuario = await obtenerUsuarioExistente(
      idUsuario,
      {
        transaction,
        lock: true,
      }
    );

    const sesionesRevocadas = await revocarSesionesUsuario(
      idUsuario,
      transaction
    );

    await UsuarioRol.update(
      { estado: false },
      {
        where: {
          id_usuario: idUsuario,
          estado: true,
        },
        transaction,
      }
    );

    await usuario.update(
      { estado: false },
      { transaction }
    );

    // Usuario tiene paranoid: true.
    await usuario.destroy({ transaction });

    return {
      id_usuario: usuario.id_usuario,
      deleted: true,
      sesiones_revocadas: sesionesRevocadas,
    };
  });
};

module.exports = deleteUsuarioService;