const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const RefreshToken = sequelize.define('RefreshToken',
  {
    /*
    |--------------------------------------------------------------------------
    | Identificador
    |--------------------------------------------------------------------------
    */

    id_refresh_token: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },

    /*
    |--------------------------------------------------------------------------
    | Usuario propietario
    |--------------------------------------------------------------------------
    */

    id_usuario: {
      type: DataTypes.BIGINT,
      allowNull: false,

      references: {
        model: 'usuarios',
        key: 'id_usuario',
      },

      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },

    /*
    |--------------------------------------------------------------------------
    | Identificador único del token
    |--------------------------------------------------------------------------
    |
    | Corresponde al session_id/jti incluido en el JWT.
    |
    */

    jti: {
      type: DataTypes.STRING(36),
      allowNull: false,
      unique: true,

      validate: {
        notEmpty: true,
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Hash del refresh token
    |--------------------------------------------------------------------------
    |
    | Nunca guardamos el refresh token en texto plano.
    | SHA-256 produce exactamente 64 caracteres hexadecimales.
    |
    */

    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,

      validate: {
        len: [64, 64],
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Fechas de sesión
    |--------------------------------------------------------------------------
    */

    fecha_expiracion: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    fecha_revocacion: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Información del cliente
    |--------------------------------------------------------------------------
    */

    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },

    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    dispositivo: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Estado
    |--------------------------------------------------------------------------
    |
    | true  = sesión activa
    | false = sesión revocada o cerrada
    |
    */

    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName:
      'refresh_tokens',

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    /*
    |--------------------------------------------------------------------------
    | No usamos paranoid
    |--------------------------------------------------------------------------
    |
    | Los tokens no se eliminan lógicamente. Cuando una sesión termina,
    | se marca estado=false y se registra fecha_revocacion.
    |
    */

    paranoid:
      false,

    indexes: [
      {
        unique: true,
        fields: [
          'jti',
        ],
        name:
          'uq_refresh_token_jti',
      },

      {
        unique: true,
        fields: [
          'token_hash',
        ],
        name:
          'uq_refresh_token_hash',
      },

      {
        fields: [
          'id_usuario',
          'estado',
        ],
        name:
          'idx_refresh_token_usuario_estado',
      },

      {
        fields: [
          'fecha_expiracion',
        ],
        name:
          'idx_refresh_token_expiracion',
      },

      {
        fields: [
          'id_usuario',
          'fecha_revocacion',
        ],
        name:
          'idx_refresh_token_usuario_revocacion',
      },
    ],
  },
);

module.exports = RefreshToken;