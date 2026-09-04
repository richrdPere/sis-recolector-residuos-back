const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const NotificacionUsuario = sequelize.define('NotificacionUsuario', {
  id_notificacion_usuario: {
    type:
      DataTypes.BIGINT,

    primaryKey:
      true,

    autoIncrement:
      true,
  },

  id_notificacion: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

    references: {
      model:
        'notificaciones',

      key:
        'id_notificacion',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  id_usuario: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

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
  | Estado de la notificación interna
  |--------------------------------------------------------------------------
  */

  leida: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      false,

    defaultValue:
      false,
  },

  fecha_leida: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  archivada: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      false,

    defaultValue:
      false,
  },

  fecha_archivada: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Estado push del destinatario
  |--------------------------------------------------------------------------
  */

  estado_push: {
    type:
      DataTypes.ENUM(
        'NO_REQUERIDO',
        'PENDIENTE',
        'PROCESANDO',
        'ENVIADO',
        'PARCIAL',
        'FALLIDO',
        'SIN_DISPOSITIVO',
      ),

    allowNull:
      false,

    defaultValue:
      'PENDIENTE',
  },

  fecha_ultimo_envio: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  cantidad_intentos: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull:
      false,

    defaultValue:
      0,
  },

  ultimo_error: {
    type:
      DataTypes.STRING(
        1000,
      ),

    allowNull:
      true,
  },
},
  {
    tableName:
      'notificacion_usuarios',

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
          'id_notificacion',
          'id_usuario',
        ],

        name:
          'uk_notificacion_usuario',
      },
      {
        fields: [
          'id_usuario',
          'leida',
          'archivada',
        ],

        name:
          'idx_notificacion_usuario_estado',
      },
      {
        fields: [
          'estado_push',
        ],

        name:
          'idx_notificacion_usuario_push',
      },
      {
        fields: [
          'id_usuario',
          'created_at',
        ],

        name:
          'idx_notificacion_usuario_fecha',
      },
    ],

    validate: {
      validReadState() {
        if (
          this.leida &&
          !this.fecha_leida
        ) {
          throw new Error(
            'Una notificación leída debe registrar su fecha de lectura.',
          );
        }

        if (
          !this.leida &&
          this.fecha_leida
        ) {
          throw new Error(
            'Una notificación no leída no debe tener fecha de lectura.',
          );
        }
      },

      validArchivedState() {
        if (
          this.archivada &&
          !this.fecha_archivada
        ) {
          throw new Error(
            'Una notificación archivada debe registrar su fecha.',
          );
        }
      },
    },
  },
);

module.exports = NotificacionUsuario;