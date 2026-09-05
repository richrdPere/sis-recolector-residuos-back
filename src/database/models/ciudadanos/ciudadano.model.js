const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Ciudadano = sequelize.define('Ciudadano', {
  id_ciudadano: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario asociado
  |--------------------------------------------------------------------------
  |
  | Cada usuario solamente puede tener un perfil ciudadano.
  |
  */

  id_usuario: {
    type:
      DataTypes.BIGINT,

    allowNull: false,
    unique: true,

    references: {
      model:
        'usuarios',

      key:
        'id_usuario',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Consentimiento
  |--------------------------------------------------------------------------
  */

  acepta_tratamiento_datos: {
    type:
      DataTypes.BOOLEAN,

    allowNull: false,
    defaultValue: false,
  },

  fecha_consentimiento: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  version_consentimiento: {
    type:
      DataTypes.STRING(30),

    allowNull: true,
  },

  origen_registro: {
    type:
      DataTypes.ENUM(
        'WEB',
        'APP',
        'QR',
        'ADMINISTRATIVO',
      ),

    allowNull: false,
    defaultValue: 'WEB',
  },

  /*
  |--------------------------------------------------------------------------
  | Verificación
  |--------------------------------------------------------------------------
  */

  celular_verificado: {
    type:
      DataTypes.BOOLEAN,

    allowNull: false,
    defaultValue: false,
  },

  fecha_verificacion_celular: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Estado
  |--------------------------------------------------------------------------
  */

  estado_ciudadano: {
    type:
      DataTypes.ENUM(
        'PENDIENTE',
        'ACTIVO',
        'SUSPENDIDO',
        'INACTIVO',
      ),

    allowNull: false,
    defaultValue: 'PENDIENTE',
  },

  fecha_activacion: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  fecha_desactivacion: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  motivo_desactivacion: {
    type:
      DataTypes.STRING(500),

    allowNull: true,
  },

  observacion: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },
},
  {
    tableName:
      'ciudadanos',

    timestamps: true,
    paranoid: true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    deletedAt:
      'deleted_at',

    indexes: [
      {
        unique: true,

        fields: [
          'id_usuario',
        ],

        name:
          'uk_ciudadano_usuario',
      },
      {
        fields: [
          'estado_ciudadano',
        ],

        name:
          'idx_ciudadano_estado',
      },
      {
        fields: [
          'celular_verificado',
        ],

        name:
          'idx_ciudadano_celular_verificado',
      },
      {
        fields: [
          'origen_registro',
        ],

        name:
          'idx_ciudadano_origen',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Consentimiento completo
      |--------------------------------------------------------------------------
      */

      consentimientoCompleto() {
        if (
          this
            .acepta_tratamiento_datos
        ) {
          if (
            !this
              .fecha_consentimiento
          ) {
            throw new Error(
              'Debe registrarse la fecha del consentimiento.',
            );
          }

          if (
            !this
              .version_consentimiento
          ) {
            throw new Error(
              'Debe registrarse la versión del consentimiento.',
            );
          }
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Verificación celular
      |--------------------------------------------------------------------------
      */

      verificacionCelularCompleta() {
        if (
          this
            .celular_verificado &&
          !this
            .fecha_verificacion_celular
        ) {
          throw new Error(
            'Debe registrarse la fecha de verificación del celular.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Desactivación completa
      |--------------------------------------------------------------------------
      */

      desactivacionCompleta() {
        if (
          this
            .estado_ciudadano ===
          'INACTIVO' &&
          !this
            .fecha_desactivacion
        ) {
          throw new Error(
            'Debe registrarse la fecha de desactivación del ciudadano.',
          );
        }
      },
    },
  },
);

module.exports = Ciudadano;