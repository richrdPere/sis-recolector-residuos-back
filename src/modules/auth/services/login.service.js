const bcrypt = require('bcryptjs');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Tokens
const {
  generateAuthTokens,
  hashToken,
  getTokenExpirationDate,
} = require('../../../config/token');

// Modelos
const {
  Persona,
  Usuario,
  Roles,
  RefreshToken,
  sequelize,
} = db;

/*
|--------------------------------------------------------------------------
| Validar dependencias del módulo
|--------------------------------------------------------------------------
*/

if (!Usuario) {
  throw new Error(
    'El modelo Usuario no está registrado.',
  );
}

if (!RefreshToken) {
  throw new Error(
    'El modelo RefreshToken no está registrado.',
  );
}

/*
|--------------------------------------------------------------------------
| Service - Iniciar sesión
|--------------------------------------------------------------------------
*/

const loginService = async ({
  username,
  password,
  ip = null,
  user_agent = null,
  dispositivo = null,
}) => {
  /*
  |--------------------------------------------------------------------------
  | 1. Normalizar credenciales
  |--------------------------------------------------------------------------
  */

  const normalizedUsername = String(
    username || '',
  )
    .trim()
    .toLowerCase();

  if (
    !normalizedUsername ||
    !password
  ) {
    throw new AppError(
      'El nombre de usuario y la contraseña son obligatorios.',
      400,
      'CREDENTIALS_REQUIRED',
    );
  }

  if (
    typeof password !== 'string'
  ) {
    throw new AppError(
      'La contraseña no tiene un formato válido.',
      400,
      'INVALID_PASSWORD_FORMAT',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 2. Buscar usuario
  |--------------------------------------------------------------------------
  */

  const usuario = await Usuario.findOne({
    where: {
      username: normalizedUsername,
    },

    attributes: [
      'id_usuario',
      'id_persona',
      'email_acceso',
      'username',
      'password',
      'estado',
      'ultimo_acceso',
      'created_at',
      'updated_at',
    ],

    include: [
      /*
      |--------------------------------------------------------------------------
      | Persona
      |--------------------------------------------------------------------------
      */

      {
        model: Persona,
        as: 'persona',

        attributes: [
          'id_persona',
          'nombres',
          'apellidos',
          'email_contacto',
          'tipo_documento',
          'numero_documento',
          'fecha_nacimiento',
          'celular',
          'direccion',
          'foto_url',
          'genero',
          'estado',
        ],

        required: true,
      },

      /*
      |--------------------------------------------------------------------------
      | Roles activos
      |--------------------------------------------------------------------------
      */

      {
        model: Roles,
        as: 'roles',

        attributes: [
          'id_rol',
          'nombre',
          'descripcion',
        ],

        where: {
          estado: true,
        },

        through: {
          where: {
            estado: true,
          },

          attributes: [],
        },

        required: false,
      },
    ],
  });

  /*
  |--------------------------------------------------------------------------
  | 3. Validar usuario
  |--------------------------------------------------------------------------
  */

  if (!usuario) {
    throw new AppError(
      'El usuario o la contraseña son incorrectos.',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  if (!usuario.estado) {
    throw new AppError(
      'La cuenta del usuario se encuentra deshabilitada.',
      403,
      'USER_INACTIVE',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 4. Validar persona
  |--------------------------------------------------------------------------
  */

  if (!usuario.persona) {
    throw new AppError(
      'El usuario no tiene una persona asociada.',
      403,
      'USER_WITHOUT_PERSON',
    );
  }

  if (!usuario.persona.estado) {
    throw new AppError(
      'El perfil personal se encuentra deshabilitado.',
      403,
      'PERSON_INACTIVE',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 5. Validar contraseña
  |--------------------------------------------------------------------------
  */

  const passwordCorrecto =
    await bcrypt.compare(
      password,
      usuario.password,
    );

  if (!passwordCorrecto) {
    throw new AppError(
      'El usuario o la contraseña son incorrectos.',
      401,
      'INVALID_CREDENTIALS',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 6. Validar roles
  |--------------------------------------------------------------------------
  */

  if (!usuario.roles?.length) {
    throw new AppError(
      'El usuario no tiene un rol activo asignado.',
      403,
      'USER_WITHOUT_ACTIVE_ROLE',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 7. Generar access token y refresh token
  |--------------------------------------------------------------------------
  */

  const {
    accessToken,
    refreshToken,
    sessionId,
    accessTokenExpiresIn,
    refreshTokenExpiresIn,
  } = generateAuthTokens({
    usuario,
    roles: usuario.roles,
  });

  /*
  |--------------------------------------------------------------------------
  | 8. Guardar sesión y último acceso
  |--------------------------------------------------------------------------
  */

  const transaction = await sequelize.transaction();

  const loginDate = new Date();

  try {
    await RefreshToken.create(
      {
        id_usuario: usuario.id_usuario,
        jti: sessionId,
        token_hash: hashToken(refreshToken),
        fecha_expiracion: getTokenExpirationDate(refreshToken,),
        fecha_revocacion: null,
        ip,
        user_agent,
        dispositivo,
        estado: true,
      },
      {
        transaction,
      },
    );

    await usuario.update(
      {
        ultimo_acceso:
          loginDate,
      },
      {
        transaction,
      },
    );

    await transaction.commit();
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error(
      'Error creando la sesión:',
      {
        name: error.name,

        message: error.message,

        original: error.original?.message,

        code: error.original?.code,

        sql: error.sql,
      },
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      'No se pudo crear la sesión del usuario.',
      500,
      'LOGIN_SESSION_ERROR',
    );
  }

  /*
  |--------------------------------------------------------------------------
  | 9. Preparar usuario seguro
  |--------------------------------------------------------------------------
  |
  | No retornamos la instancia completa porque contiene password.
  |
  */

  const usuarioData = {
    id_usuario:
      usuario.id_usuario,

    id_persona:
      usuario.id_persona,

    email:
      usuario.email,

    username:
      usuario.username,

    estado:
      usuario.estado,

    ultimo_acceso:
      loginDate,

    persona: {
      id_persona:
        usuario.persona.id_persona,

      nombres:
        usuario.persona.nombres,

      apellidos:
        usuario.persona.apellidos,

      tipo_documento:
        usuario.persona
          .tipo_documento,

      numero_documento:
        usuario.persona
          .numero_documento,

      fecha_nacimiento:
        usuario.persona
          .fecha_nacimiento,

      celular:
        usuario.persona.celular,

      direccion:
        usuario.persona.direccion,

      foto_url:
        usuario.persona.foto_url,

      genero:
        usuario.persona.genero,

      estado:
        usuario.persona.estado,
    },

    roles:
      usuario.roles.map((rol) => ({
        id_rol:
          rol.id_rol,

        nombre:
          rol.nombre,

        descripcion:
          rol.descripcion,
      })),
  };

  /*
  |--------------------------------------------------------------------------
  | 10. Retornar sesión
  |--------------------------------------------------------------------------
  */

  return {
    access_token:
      accessToken,

    refresh_token:
      refreshToken,

    token_type:
      'Bearer',

    expires_in:
      accessTokenExpiresIn,

    refresh_expires_in:
      refreshTokenExpiresIn,

    usuario:
      usuarioData,
  };
};

module.exports = loginService;