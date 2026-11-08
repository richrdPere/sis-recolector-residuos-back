const db = require("../../../database/models");

// Modelos
const {
  sequelize,
  Persona,
  Usuario,
  UsuarioRol,
} = db;

// Utils
const {
  validarObjeto,
  validarCampos,
  validarTexto,
  validarEmail,
  validarEstado,
  validarPersona,
  validarRolesIds,
  generarPasswordHash,
  verificarUnicidadUsuario,
  verificarDocumentoDisponible,
  verificarRolesActivos,
  obtenerUsuarioSeguro,
  traducirErrorEscritura,
} = require("../utils/usuario-write.utils");

// Auditoria
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');

// *********************************************************
// SERVICE: CREATE USUARIO
// *********************************************************
const createUsuarioService = async (params = {}) => {
  validarObjeto(params, "Los parámetros");

  validarCampos(
    params,
    [
      "username",
      "email_acceso",
      "password",
      "persona",
      "roles_ids",
      "estado",
    ],
    "Usuario"
  );

  const datosUsuario = {
    username: validarTexto(
      params.username,
      "username",
      50
    ).toLowerCase(),

    email_acceso: validarEmail(
      params.email_acceso,
      "email_acceso"
    ),

    estado: params.estado === undefined
      ? true
      : validarEstado(params.estado),
  };

  const datosPersona = validarPersona(params.persona);
  const rolesIds = validarRolesIds(params.roles_ids);

  const auditarUsuario = prepararAuditoria(
    'USUARIO',
    'CREAR',
  );

  // Hash fuera de la transacción para reducir el tiempo de bloqueo.
  const passwordHash = await generarPasswordHash(params.password);

  try {
    return await sequelize.transaction(async (transaction) => {
      await verificarUnicidadUsuario(datosUsuario, {
        transaction,
      });

      await verificarDocumentoDisponible(
        datosPersona.numero_documento,
        { transaction }
      );

      await verificarRolesActivos(rolesIds, transaction);

      const persona = await Persona.create(
        {
          ...datosPersona,
          estado: true,
        },
        { transaction }
      );

      const usuario = await Usuario.create(
        {
          ...datosUsuario,
          id_persona: persona.id_persona,
          password: passwordHash,
        },
        { transaction }
      );



      await UsuarioRol.bulkCreate(
        rolesIds.map((idRol) => ({
          id_usuario: usuario.id_usuario,
          id_rol: idRol,
          estado: true,
        })),
        {
          transaction,
          validate: true,
        }
      );

      // Auditoria
      await auditarUsuario(
        {
          id_usuario: usuario.id_usuario,
          username: usuario.username,
          email_acceso: usuario.email_acceso,
          id_persona: usuario.id_persona,
          estado: usuario.estado,

          roles_ids: rolesIds.map(String).sort(),
        },
        transaction,
      );

      return obtenerUsuarioSeguro(
        usuario.id_usuario,
        transaction
      );
    });
  } catch (error) {
    throw traducirErrorEscritura(error);
  }
};

module.exports = createUsuarioService;