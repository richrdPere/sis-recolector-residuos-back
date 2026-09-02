const bcrypt = require('bcryptjs');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Modelos
const {
  Usuario,
  RefreshToken,
  sequelize,
} = db;

// *****************************************
// Service - Change Password
// *****************************************
const changePasswordService = async ({
  id_usuario,
  password_actual,
  password_nueva,
}) => {
  if (!password_actual || !password_nueva) {
    throw new AppError(
      'La contraseña actual y la nueva son obligatorias.',
      400,
      'PASSWORDS_REQUIRED',
    );
  }

  if (password_nueva.length < 8) {
    throw new AppError(
      'La nueva contraseña debe tener al menos 8 caracteres.',
      400,
      'INVALID_NEW_PASSWORD_LENGTH',
    );
  }

  if (password_actual === password_nueva) {
    throw new AppError(
      'La nueva contraseña debe ser diferente de la actual.',
      400,
      'PASSWORD_NOT_CHANGED',
    );
  }

  const usuario = await Usuario.findByPk(
    id_usuario,
    {
      attributes: [
        'id_usuario',
        'password',
        'estado',
      ],
    },
  );

  if (!usuario) {
    throw new AppError(
      'El usuario no fue encontrado.',
      404,
      'USER_NOT_FOUND',
    );
  }

  if (!usuario.estado) {
    throw new AppError(
      'La cuenta del usuario está inactiva.',
      403,
      'USER_INACTIVE',
    );
  }

  const currentPasswordIsValid =
    await bcrypt.compare(
      password_actual,
      usuario.password,
    );

  if (!currentPasswordIsValid) {
    throw new AppError(
      'La contraseña actual no es correcta.',
      401,
      'CURRENT_PASSWORD_INVALID',
    );
  }

  const newPasswordHash = await bcrypt.hash(
    password_nueva,
    12,
  );

  const transaction =
    await sequelize.transaction();

  try {
    await usuario.update(
      {
        password: newPasswordHash,
      },
      {
        transaction,
      },
    );

    // Revocar todas las sesiones
    await RefreshToken.update(
      {
        estado: false,
        fecha_revocacion: new Date(),
      },
      {
        where: {
          id_usuario,
          estado: true,
          fecha_revocacion: null,
        },
        transaction,
      },
    );

    await transaction.commit();

    return {
      password_changed: true,
      sessions_revoked: true,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = changePasswordService;