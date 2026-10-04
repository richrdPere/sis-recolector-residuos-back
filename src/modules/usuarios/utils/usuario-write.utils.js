const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const db = require("../../../database/models");

const {
    Usuario,
    Persona,
    Roles,
    RefreshToken,
} = db;

const {
    crearHttpError,
    validarId,
} = require("../validations/usuario.validation");

const {
    USUARIO_ATTRIBUTES,
    crearIncludePersona,
    completarUsuariosConRoles,
} = require("./usuario-service.utils");

// ============================================================
// VALIDACIONES
// ============================================================

const validarObjeto = (value, nombre) => {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw crearHttpError(`${nombre} debe ser un objeto.`);
    }

    return value;
};

const validarCampos = (datos, permitidos, nombre) => {
    const desconocidos = Object.keys(datos).filter(
        (campo) => !permitidos.includes(campo)
    );

    if (desconocidos.length) {
        throw crearHttpError(
            `${nombre}: campos no permitidos: ${desconocidos.join(", ")}.`
        );
    }
};

const validarTexto = (
    value,
    campo,
    max,
    { nullable = false } = {}
) => {
    if (nullable && (value === null || value === "")) {
        return null;
    }

    if (typeof value !== "string") {
        throw crearHttpError(`${campo} debe ser una cadena.`);
    }

    const texto = value.trim();

    if (!texto) {
        if (nullable) return null;

        throw crearHttpError(`${campo} es obligatorio.`);
    }

    if (texto.length > max) {
        throw crearHttpError(
            `${campo} no puede superar ${max} caracteres.`
        );
    }

    return texto;
};

const validarEmail = (value, campo, nullable = false) => {
    const email = validarTexto(value, campo, 150, { nullable });

    if (email === null) return null;

    // El modelo también ejecuta su validación isEmail.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw crearHttpError(`${campo} no tiene un formato válido.`);
    }

    return email.toLowerCase();
};

const validarEstado = (value, campo = "estado") => {
    if (typeof value !== "boolean") {
        throw crearHttpError(`${campo} debe ser true o false.`);
    }

    return value;
};

const validarPassword = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        throw crearHttpError("La contraseña es obligatoria.");
    }

    // No aplicar trim al valor que se guarda.
    if (value.length < 8) {
        throw crearHttpError(
            "La contraseña debe tener al menos 8 caracteres."
        );
    }

    // bcrypt limita la entrada a 72 bytes.
    if (Buffer.byteLength(value, "utf8") > 72) {
        throw crearHttpError(
            "La contraseña no puede superar 72 bytes."
        );
    }

    return value;
};

const generarPasswordHash = (password) =>
    bcrypt.hash(validarPassword(password), 12);

const validarFechaNacimiento = (value) => {
    if (value === null || value === "") return null;

    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        throw crearHttpError(
            "fecha_nacimiento debe tener formato YYYY-MM-DD."
        );
    }

    const fecha = new Date(`${value}T00:00:00Z`);

    if (
        !Number.isFinite(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== value
    ) {
        throw crearHttpError("fecha_nacimiento no es válida.");
    }

    return value;
};

const validarPersona = (datos, { parcial = false } = {}) => {
    validarObjeto(datos, "persona");

    const permitidos = [
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
    ];

    validarCampos(datos, permitidos, "persona");

    const resultado = {};

    for (const campo of ["nombres", "apellidos", "numero_documento"]) {
        if (!parcial || Object.hasOwn(datos, campo)) {
            resultado[campo] = validarTexto(
                datos[campo],
                campo,
                campo === "numero_documento" ? 20 : 100
            );
        }
    }

    if (!parcial || Object.hasOwn(datos, "tipo_documento")) {
        const tipo = datos.tipo_documento === undefined && !parcial
            ? "DNI"
            : datos.tipo_documento;

        if (!["DNI", "RUC", "CE", "PASAPORTE"].includes(tipo)) {
            throw crearHttpError(
                "tipo_documento debe ser DNI, RUC, CE o PASAPORTE."
            );
        }

        resultado.tipo_documento = tipo;
    }

    if (Object.hasOwn(datos, "email_contacto")) {
        resultado.email_contacto = validarEmail(
            datos.email_contacto,
            "email_contacto",
            true
        );
    }

    if (Object.hasOwn(datos, "fecha_nacimiento")) {
        resultado.fecha_nacimiento = validarFechaNacimiento(
            datos.fecha_nacimiento
        );
    }

    for (const [campo, max] of [
        ["celular", 20],
        ["direccion", 255],
        ["foto_url", 255],
    ]) {
        if (Object.hasOwn(datos, campo)) {
            resultado[campo] = validarTexto(
                datos[campo],
                campo,
                max,
                { nullable: true }
            );
        }
    }

    if (Object.hasOwn(datos, "genero")) {
        if (
            datos.genero !== null &&
            !["M", "F", "OTRO"].includes(datos.genero)
        ) {
            throw crearHttpError("genero debe ser M, F, OTRO o null.");
        }

        resultado.genero = datos.genero;
    }

    return resultado;
};

const validarRolesIds = (value) => {
    if (!Array.isArray(value) || !value.length) {
        throw crearHttpError("Debes asignar al menos un rol.");
    }

    return [...new Set(
        value.map((id) => validarId(id, "roles_ids"))
    )];
};

// ============================================================
// UNICIDAD
// ============================================================

const verificarUnicidadUsuario = async (
    datos,
    { idUsuario, transaction }
) => {
    for (const campo of ["username", "email_acceso"]) {
        if (!Object.hasOwn(datos, campo)) continue;

        const existente = await Usuario.findOne({
            attributes: ["id_usuario"],
            where: {
                [campo]: datos[campo],
                ...(idUsuario
                    ? { id_usuario: { [Op.ne]: idUsuario } }
                    : {}),
            },

            // Los índices únicos también incluyen usuarios eliminados.
            paranoid: false,
            transaction,
        });

        if (existente) {
            throw crearHttpError(
                campo === "username"
                    ? "Ya existe un usuario con ese nombre de usuario."
                    : "Ya existe un usuario con ese correo de acceso.",
                409
            );
        }
    }
};

const verificarDocumentoDisponible = async (
    numeroDocumento,
    { idPersona, transaction }
) => {
    const existente = await Persona.findOne({
        attributes: ["id_persona"],
        where: {
            numero_documento: numeroDocumento,
            ...(idPersona
                ? { id_persona: { [Op.ne]: idPersona } }
                : {}),
        },
        transaction,
    });

    if (existente) {
        throw crearHttpError(
            "Ya existe una persona con ese número de documento.",
            409
        );
    }
};

// ============================================================
// ROLES / SESIONES / RESPUESTA
// ============================================================

const verificarRolesActivos = async (ids, transaction) => {
    const roles = await Roles.findAll({
        attributes: ["id_rol"],
        where: {
            id_rol: { [Op.in]: ids },
            estado: true,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (roles.length !== ids.length) {
        throw crearHttpError(
            "Uno o más roles no existen o no están activos."
        );
    }
};

const revocarSesionesUsuario = async (
    idUsuario,
    transaction
) => {
    const [cantidad] = await RefreshToken.update(
        {
            estado: false,
            fecha_revocacion: new Date(),
        },
        {
            where: {
                id_usuario: idUsuario,
                estado: true,
            },
            transaction,
        }
    );

    return cantidad;
};

const obtenerUsuarioSeguro = async (idUsuario, transaction) => {
    const usuario = await Usuario.findByPk(idUsuario, {
        attributes: USUARIO_ATTRIBUTES,
        include: [crearIncludePersona()],
        transaction,
    });

    if (!usuario) {
        throw crearHttpError("Usuario no encontrado.", 404);
    }

    const [resultado] = await completarUsuariosConRoles(
        [usuario],
        {
            estadoAsignacion: true,
            soloRolesActivos: true,
            transaction,
        }
    );

    return resultado;
};

// Maneja también duplicados producidos por solicitudes simultáneas.
const traducirErrorEscritura = (error) => {
    if (error.statusCode) return error;

    if (error.name === "SequelizeUniqueConstraintError") {
        const campos = [
            ...Object.keys(error.fields || {}),
            ...(error.errors || []).map((item) => item.path),
        ].join(" ");

        if (campos.includes("numero_documento")) {
            return crearHttpError(
                "Ya existe una persona con ese número de documento.",
                409
            );
        }

        if (campos.includes("email_acceso")) {
            return crearHttpError(
                "Ya existe un usuario con ese correo de acceso.",
                409
            );
        }

        if (campos.includes("username")) {
            return crearHttpError(
                "Ya existe un usuario con ese nombre de usuario.",
                409
            );
        }

        return crearHttpError(
            "El registro contiene un valor que ya existe.",
            409
        );
    }

    if (error.name === "SequelizeValidationError") {
        return crearHttpError(
            error.errors?.[0]?.message ||
            "Los datos del usuario no son válidos."
        );
    }

    return error;
};

module.exports = {
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
    revocarSesionesUsuario,
    obtenerUsuarioSeguro,
    traducirErrorEscritura,
};