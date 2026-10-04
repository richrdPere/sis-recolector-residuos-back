const db = require("../../../database/models");

// Modelos
const { sequelize } = db;

// Validations
const { validarId } = require("../validations/usuario.validation");

// Utils
const { obtenerUsuarioExistente } = require("../utils/usuario-service.utils");

const {
  validarObjeto,
  validarCampos,
  generarPasswordHash,
  revocarSesionesUsuario,
} = require("../utils/usuario-write.utils");

// *********************************************************
// SERVICE: RESET PASSWORD USUARIO
// *********************************************************
const resetPasswordUsuarioService = async (params = {}) => {
  validarObjeto(params, "Los parámetros");

  validarCampos(
    params,
    ["id_usuario", "nueva_password"],
    "Restablecimiento de contraseña"
  );

  const idUsuario = validarId(
    params.id_usuario,
    "id_usuario"
  );

  const passwordHash = await generarPasswordHash(
    params.nueva_password
  );

  return sequelize.transaction(async (transaction) => {
    const usuario = await obtenerUsuarioExistente(
      idUsuario,
      {
        transaction,
        lock: true,
      }
    );

    await usuario.update(
      { password: passwordHash },
      { transaction }
    );

    const sesionesRevocadas = await revocarSesionesUsuario(
      idUsuario,
      transaction
    );

    return {
      id_usuario: usuario.id_usuario,
      password_actualizada: true,
      sesiones_revocadas: sesionesRevocadas,
    };
  });
};

module.exports = resetPasswordUsuarioService;