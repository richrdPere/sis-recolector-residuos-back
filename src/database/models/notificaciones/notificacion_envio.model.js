const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const NotificacionEnvio = sequelize.define('NotificacionEnvio', {
  id_envio: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_notificacion_usuario: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'notificacion_usuarios',
      key: 'id_notificacion_usuario',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  id_dispositivo: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'usuario_dispositivos',
      key: 'id_dispositivo',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  proveedor: {
    type:
      DataTypes.ENUM(
        'FCM',
      ),

    allowNull:
      false,

    defaultValue:
      'FCM',
  },

  numero_intento: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull:
      false,

    defaultValue:
      1,

    validate: {
      min: {
        args: [1],

        msg:
          'El número de intento debe ser mayor que cero.',
      },
    },
  },

  estado_envio: {
    type:
      DataTypes.ENUM(
        'PENDIENTE',
        'PROCESANDO',
        'ENVIADO',
        'FALLIDO',
        'TOKEN_INVALIDO',
        'CANCELADO',
      ),

    allowNull:
      false,

    defaultValue:
      'PENDIENTE',
  },

  /*
  |--------------------------------------------------------------------------
  | Respuesta del proveedor
  |--------------------------------------------------------------------------
  */

  id_mensaje_proveedor: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull:
      true,
  },

  codigo_error: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      true,
  },

  mensaje_error: {
    type:
      DataTypes.STRING(
        1000,
      ),

    allowNull:
      true,
  },

  respuesta_proveedor: {
    type:
      DataTypes.JSON,

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Fechas
  |--------------------------------------------------------------------------
  */

  fecha_intento: {
    type:
      DataTypes.DATE,

    allowNull:
      false,

    defaultValue:
      DataTypes.NOW,
  },

  fecha_envio: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  duracion_ms: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull:
      true,
  },
},
  {
    tableName:
      'notificacion_envios',

    /*
    | Cada intento es inmutable.
    */

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      false,

    indexes: [
      {
        unique:
          true,

        fields: [
          'id_notificacion_usuario',
          'id_dispositivo',
          'numero_intento',
        ],

        name:
          'uk_envio_destino_intento',
      },
      {
        fields: [
          'estado_envio',
        ],

        name:
          'idx_envio_estado',
      },
      {
        fields: [
          'id_notificacion_usuario',
        ],

        name:
          'idx_envio_notificacion_usuario',
      },
      {
        fields: [
          'id_dispositivo',
        ],

        name:
          'idx_envio_dispositivo',
      },
      {
        fields: [
          'fecha_intento',
        ],

        name:
          'idx_envio_fecha',
      },
    ],

    validate: {
      validSuccessfulDelivery() {
        if (
          this.estado_envio ===
          'ENVIADO' &&
          !this.fecha_envio
        ) {
          throw new Error(
            'Un envío exitoso debe registrar su fecha de envío.',
          );
        }
      },

      validFailedDelivery() {
        if (
          [
            'FALLIDO',
            'TOKEN_INVALIDO',
          ].includes(
            this.estado_envio,
          ) &&
          !this.mensaje_error
        ) {
          throw new Error(
            'Un envío fallido debe registrar el mensaje de error.',
          );
        }
      },
    },
  },
);

module.exports = NotificacionEnvio;