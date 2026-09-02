const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    Persona,
    Usuario,
    Roles,
    UsuarioRol,
    sequelize,
} = db;

/*
|--------------------------------------------------------------------------
| Normalizadores
|--------------------------------------------------------------------------
*/

const normalizeEmail = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase();
};

const normalizeUsername = (value) => {
    return String(value || '')
        .trim()
        .toLowerCase();
};

const normalizeDocument = (value) => {
    return String(value || '')
        .trim()
        .toUpperCase();
};

/*
|--------------------------------------------------------------------------
| Crear usuario
|--------------------------------------------------------------------------
*/

const createUsuarioService = async ({
    nombres,
    apellidos,
    tipo_documento = 'DNI',
    numero_documento,
    fecha_nacimiento = null,
    celular = null,
    direccion = null,
    foto_url = null,
    genero = null,

    email,
    username,
    password,

    id_rol = null,
    roles_ids = [],
}) => {
    const normalizedEmail = normalizeEmail(email);

    const normalizedUsername =
        normalizeUsername(username);

    const normalizedDocument =
        normalizeDocument(numero_documento);

    if (!nombres?.trim()) {
        throw new AppError(
            'Los nombres son obligatorios.',
            400,
            'NOMBRES_REQUIRED',
        );
    }

    if (!apellidos?.trim()) {
        throw new AppError(
            'Los apellidos son obligatorios.',
            400,
            'APELLIDOS_REQUIRED',
        );
    }

    if (!normalizedDocument) {
        throw new AppError(
            'El número de documento es obligatorio.',
            400,
            'NUMERO_DOCUMENTO_REQUIRED',
        );
    }

    if (!normalizedEmail) {
        throw new AppError(
            'El correo es obligatorio.',
            400,
            'EMAIL_REQUIRED',
        );
    }

    if (!normalizedUsername) {
        throw new AppError(
            'El nombre de usuario es obligatorio.',
            400,
            'USERNAME_REQUIRED',
        );
    }

    if (!password || password.length < 8) {
        throw new AppError(
            'La contraseña debe tener al menos 8 caracteres.',
            400,
            'INVALID_PASSWORD_LENGTH',
        );
    }

    const requestedRoleIds = [
        ...new Set(
            [
                id_rol,
                ...roles_ids,
            ]
                .filter(Boolean)
                .map(Number),
        ),
    ];

    if (requestedRoleIds.length === 0) {
        throw new AppError(
            'Debe asignar al menos un rol.',
            400,
            'ROLE_REQUIRED',
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Validar duplicados
    |--------------------------------------------------------------------------
    */

    const personaExists = await Persona.findOne({
        where: {
            tipo_documento,
            numero_documento: normalizedDocument,
        },
        attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
        ],
    });

    if (personaExists) {
        throw new AppError(
            'Ya existe una persona con ese documento.',
            409,
            'DOCUMENT_ALREADY_EXISTS',
        );
    }

    const usuarioExists = await Usuario.findOne({
        where: {
            [Op.or]: [
                {
                    email_acceso: normalizedEmail,
                },
                {
                    username: normalizedUsername,
                },
            ],
        },
        attributes: [
            'id_usuario',
            'email_acceso',
            'username',
        ],
        paranoid: false,
    });

    if (usuarioExists) {
        if (usuarioExists.email_acceso === normalizedEmail) {
            throw new AppError(
                'El correo ya se encuentra registrado.',
                409,
                'EMAIL_ALREADY_EXISTS',
            );
        }

        throw new AppError(
            'El nombre de usuario ya se encuentra registrado.',
            409,
            'USERNAME_ALREADY_EXISTS',
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Validar roles
    |--------------------------------------------------------------------------
    */

    const roles = await Roles.findAll({
        where: {
            id_rol: {
                [Op.in]: requestedRoleIds,
            },
            estado: true,
        },
        attributes: [
            'id_rol',
            'nombre',
            'descripcion',
        ],
    });

    if (roles.length !== requestedRoleIds.length) {
        throw new AppError(
            'Uno o más roles no existen o están inactivos.',
            400,
            'INVALID_ROLES',
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Crear registro transaccional
    |--------------------------------------------------------------------------
    */

    const transaction =
        await sequelize.transaction();

    try {
        const persona = await Persona.create(
            {
                nombres: nombres.trim(),
                apellidos: apellidos.trim(),
                tipo_documento,
                numero_documento: normalizedDocument,
                fecha_nacimiento,
                email_contacto: normalizedEmail,
                celular,
                direccion,
                foto_url,
                genero,
                estado: true,
            },
            {
                transaction,
            },
        );

        const passwordHash = await bcrypt.hash(
            password,
            12,
        );

        const usuario = await Usuario.create(
            {
                id_persona: persona.id_persona,
                email_acceso: normalizedEmail,
                username: normalizedUsername,
                password: passwordHash,
                estado: true,
            },
            {
                transaction,
            },
        );

        await UsuarioRol.bulkCreate(
            roles.map((rol) => ({
                id_usuario: usuario.id_usuario,
                id_rol: rol.id_rol,
                estado: true,
            })),
            {
                transaction,
            },
        );

        await transaction.commit();

        return {
            id_usuario: usuario.id_usuario,
            id_persona: persona.id_persona,

            email: usuario.email,
            username: usuario.username,
            estado: usuario.estado,

            persona: {
                id_persona: persona.id_persona,
                nombres: persona.nombres,
                apellidos: persona.apellidos,
                tipo_documento:
                    persona.tipo_documento,
                numero_documento:
                    persona.numero_documento,
                fecha_nacimiento:
                    persona.fecha_nacimiento,
                celular: persona.celular,
                direccion: persona.direccion,
                foto_url: persona.foto_url,
                genero: persona.genero,
                estado: persona.estado,
            },

            roles: roles.map((rol) => ({
                id_rol: rol.id_rol,
                nombre: rol.nombre,
                descripcion: rol.descripcion,
            })),
        };
    } catch (error) {
        await transaction.rollback();

        if (error instanceof AppError) {
            throw error;
        }

        if (
            error.name ===
            'SequelizeUniqueConstraintError'
        ) {
            throw new AppError(
                'El documento, correo o usuario ya se encuentra registrado.',
                409,
                'USER_UNIQUE_CONSTRAINT',
                error.errors?.map((item) => ({
                    field: item.path,
                    message: item.message,
                })),
            );
        }

        throw error;
    }
};

module.exports = createUsuarioService;
