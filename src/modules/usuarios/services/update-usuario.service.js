const db = require("../../../database/models");

// Modelos
const { sequelize, Persona } = db;

// Validations
const {
  crearHttpError,
  validarId,
} = require("../validations/usuario.validation");

// Utils
const { obtenerUsuarioExistente } = require("../utils/usuario-service.utils");

const {
  validarObjeto,
  validarCampos,
  validarTexto,
  validarEmail,
  validarPersona,
  verificarUnicidadUsuario,
  verificarDocumentoDisponible,
  obtenerUsuarioSeguro,
  traducirErrorEscritura,
} = require("../utils/usuario-write.utils");

// *********************************************************
// SERVICE: ACTUALIZAR USUARIO
// *********************************************************
const updateUsuarioService = async (params = {}) => {
  validarObjeto(params, "Los parámetros");

  validarCampos(
    params,
    ["id_usuario", "username", "email_acceso", "persona"],
    "Actualización de usuario"
  );

  const idUsuario = validarId(
    params.id_usuario,
    "id_usuario"
  );

  const datosUsuario = {};

  if (Object.hasOwn(params, "username")) {
    datosUsuario.username = validarTexto(
      params.username,
      "username",
      50
    ).toLowerCase();
  }

  if (Object.hasOwn(params, "email_acceso")) {
    datosUsuario.email_acceso = validarEmail(
      params.email_acceso,
      "email_acceso"
    );
  }

  const datosPersona = Object.hasOwn(params, "persona")
    ? validarPersona(params.persona, { parcial: true })
    : {};

  if (
    !Object.keys(datosUsuario).length &&
    !Object.keys(datosPersona).length
  ) {
    throw crearHttpError(
      "Debes enviar al menos un campo para actualizar."
    );
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const usuario = await obtenerUsuarioExistente(
        idUsuario,
        {
          transaction,
          lock: true,
        }
      );

      const persona = await Persona.findByPk(
        usuario.id_persona,
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }
      );

      if (!persona) {
        throw crearHttpError(
          "La persona asociada al usuario no existe.",
          404
        );
      }

      await verificarUnicidadUsuario(datosUsuario, {
        idUsuario,
        transaction,
      });

      if (Object.hasOwn(datosPersona, "numero_documento")) {
        await verificarDocumentoDisponible(
          datosPersona.numero_documento,
          {
            idPersona: usuario.id_persona,
            transaction,
          }
        );
      }

      if (Object.keys(datosUsuario).length) {
        await usuario.update(datosUsuario, { transaction });
      }

      if (Object.keys(datosPersona).length) {
        await persona.update(datosPersona, { transaction });
      }

      return obtenerUsuarioSeguro(idUsuario, transaction);
    });
  } catch (error) {
    throw traducirErrorEscritura(error);
  }
};

module.exports = updateUsuarioService;