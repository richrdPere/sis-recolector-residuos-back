const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const RecorridoEvento = sequelize.define('RecorridoEvento', {
  id_recorrido_evento: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Recorrido
  |--------------------------------------------------------------------------
  */

  id_recorrido: {
    type:
      DataTypes.BIGINT,

    allowNull: false,

    references: {
      model:
        'recorridos',

      key:
        'id_recorrido',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario responsable
  |--------------------------------------------------------------------------
  */

  id_usuario: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

    references: {
      model:
        'usuarios',

      key:
        'id_usuario',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'SET NULL',
  },

  /*
  |--------------------------------------------------------------------------
  | Tipo de evento
  |--------------------------------------------------------------------------
  */

  tipo_evento: {
    type:
      DataTypes.ENUM(
        'INICIO',
        'PAUSA',
        'REANUDACION',
        'FINALIZACION',
        'CANCELACION',
      ),

    allowNull: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Fechas
  |--------------------------------------------------------------------------
  |
  | fecha_evento representa cuándo ocurrió en el dispositivo.
  | fecha_recepcion representa cuándo llegó al backend.
  |
  */

  fecha_evento: {
    type:
      DataTypes.DATE,

    allowNull: false,
    defaultValue:
      DataTypes.NOW,
  },

  fecha_recepcion: {
    type:
      DataTypes.DATE,

    allowNull: false,
    defaultValue:
      DataTypes.NOW,
  },

  /*
  |--------------------------------------------------------------------------
  | Ubicación del evento
  |--------------------------------------------------------------------------
  */

  latitud: {
    type:
      DataTypes.DECIMAL(
        10,
        7,
      ),

    allowNull: true,

    validate: {
      min: -90,
      max: 90,
    },
  },

  longitud: {
    type:
      DataTypes.DECIMAL(
        10,
        7,
      ),

    allowNull: true,

    validate: {
      min: -180,
      max: 180,
    },
  },

  precision_gps: {
    type:
      DataTypes.DECIMAL(
        8,
        2,
      ),

    allowNull: true,

    validate: {
      min: 0,
    },

    comment:
      'Precisión GPS expresada en metros.',
  },

  /*
  |--------------------------------------------------------------------------
  | Observación
  |--------------------------------------------------------------------------
  */

  observacion: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Idempotencia
  |--------------------------------------------------------------------------
  |
  | Evita eventos duplicados cuando la aplicación móvil reintenta una
  | petición después de trabajar sin conexión.
  |
  */

  clave_idempotencia: {
    type:
      DataTypes.STRING(
        100,
      ),

    allowNull: true,
    unique: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Información adicional
  |--------------------------------------------------------------------------
  */

  datos: {
    type:
      DataTypes.JSON,

    allowNull: true,

    comment:
      'Información adicional asociada con el evento.',
  },

  /*
  |--------------------------------------------------------------------------
  | Auditoría de origen
  |--------------------------------------------------------------------------
  */

  origen: {
    type:
      DataTypes.ENUM(
        'WEB',
        'APP',
        'SISTEMA',
      ),

    allowNull: false,
    defaultValue:
      'APP',
  },

  ip: {
    type:
      DataTypes.STRING(
        45,
      ),

    allowNull: true,
  },

  user_agent: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull: true,
  },
},
  {
    tableName:
      'recorrido_eventos',

    /*
    |--------------------------------------------------------------------------
    | Los eventos son registros inmutables
    |--------------------------------------------------------------------------
    |
    | Solo registramos created_at. No deberían editarse ni eliminarse.
    |
    */

    timestamps: true,

    createdAt:
      'created_at',

    updatedAt: false,

    indexes: [
      {
        fields: [
          'id_recorrido',
          'fecha_evento',
        ],
      },
      {
        fields: [
          'tipo_evento',
        ],
      },
      {
        fields: [
          'id_usuario',
        ],
      },
    ],
  },
);

module.exports = RecorridoEvento;