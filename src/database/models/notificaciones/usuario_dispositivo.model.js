const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const UsuarioDispositivo = sequelize.define('UsuarioDispositivo', {
  id_dispositivo: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_usuario: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id_usuario',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Identificador local del dispositivo
  |--------------------------------------------------------------------------
  |
  | Debe generarse una sola vez desde Flutter y conservarse localmente.
  |
  */

  identificador_dispositivo: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      false,
  },

  /*
  |--------------------------------------------------------------------------
  | Token FCM
  |--------------------------------------------------------------------------
  */

  token_push: {
    type:
      DataTypes.STRING(
        512,
      ),

    allowNull:
      true,
  },

  plataforma: {
    type:
      DataTypes.ENUM(
        'ANDROID',
        'IOS',
        'WEB',
      ),

    allowNull:
      false,

    defaultValue:
      'ANDROID',
  },

  nombre_dispositivo: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      true,
  },

  modelo_dispositivo: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      true,
  },

  version_sistema: {
    type:
      DataTypes.STRING(
        50,
      ),

    allowNull:
      true,
  },

  version_aplicacion: {
    type:
      DataTypes.STRING(
        50,
      ),

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Permiso y estado
  |--------------------------------------------------------------------------
  */

  permiso_notificaciones: {
    type:
      DataTypes.ENUM(
        'NO_SOLICITADO',
        'AUTORIZADO',
        'DENEGADO',
        'PROVISIONAL',
      ),

    allowNull:
      false,

    defaultValue:
      'NO_SOLICITADO',
  },

  estado_dispositivo: {
    type:
      DataTypes.ENUM(
        'ACTIVO',
        'INACTIVO',
        'REVOCADO',
      ),

    allowNull:
      false,

    defaultValue:
      'ACTIVO',
  },

  fecha_registro_token: {
    type:
      DataTypes.DATE,

    allowNull:
      false,

    defaultValue:
      DataTypes.NOW,
  },

  fecha_ultima_actividad: {
    type:
      DataTypes.DATE,

    allowNull:
      false,

    defaultValue:
      DataTypes.NOW,
  },

  fecha_desactivacion: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  motivo_desactivacion: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull:
      true,
  },
},
  {
    tableName:
      'usuario_dispositivos',

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    indexes: [
      {
        unique:
          true,

        fields: [
          'token_push',
        ],

        name:
          'uk_dispositivo_token_push',
      },
      {
        unique:
          true,

        fields: [
          'id_usuario',
          'identificador_dispositivo',
        ],

        name:
          'uk_usuario_identificador_dispositivo',
      },
      {
        fields: [
          'id_usuario',
          'estado_dispositivo',
        ],

        name:
          'idx_dispositivo_usuario_estado',
      },
      {
        fields: [
          'fecha_ultima_actividad',
        ],

        name:
          'idx_dispositivo_ultima_actividad',
      },
    ],

    validate: {
      validDeactivation() {
        if (
          [
            'INACTIVO',
            'REVOCADO',
          ].includes(
            this
              .estado_dispositivo,
          ) &&
          !this
            .fecha_desactivacion
        ) {
          throw new Error(
            'Un dispositivo inactivo o revocado debe registrar su fecha de desactivación.',
          );
        }
      },
    },
  },
);

module.exports = UsuarioDispositivo;