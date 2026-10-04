const db = require("../../../database/models");

// Models
const { Usuario } = db;

// Validations
const {
    crearHttpError,
    validarId,
} = require("../validations/usuario.validation");

// Utils
const {
    USUARIO_ATTRIBUTES,
    crearIncludePersona,
    completarUsuariosConRoles,
} = require("../utils/usuario-service.utils");


// *********************************************************
// SERVICE: OBTENER USUARIO POR ID
// *********************************************************
const getUsuarioByIdService = async (idUsuario) => {
    const id_usuario = validarId(idUsuario, "id_usuario");

    const usuario = await Usuario.findByPk(id_usuario, {
        attributes: USUARIO_ATTRIBUTES,
        include: [crearIncludePersona()],
    });

    if (!usuario) {
        throw crearHttpError("Usuario no encontrado.", 404);
    }

    const [detalle] = await completarUsuariosConRoles([
        usuario,
    ]);

    return detalle;
};

module.exports = getUsuarioByIdService;
