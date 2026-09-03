const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Recorrido = sequelize.define('Recorrido', {
  id_recorrido: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Programación de origen
  |--------------------------------------------------------------------------
  |
  | Una programación solamente puede generar un recorrido.
  |
  */

  id_programacion: {
    type:
      DataTypes.BIGINT,

    allowNull: false,
    unique: true,

    references: {
      model: 'programacion_rutas',
      key: 'id_programacion',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que inició el recorrido
  |--------------------------------------------------------------------------
  */

  id_usuario_inicio: {
    type:
      DataTypes.BIGINT,

    allowNull: false,

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
  | Usuario que finalizó el recorrido
  |--------------------------------------------------------------------------
  */

  id_usuario_finalizacion: {
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
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Estado operativo
  |--------------------------------------------------------------------------
  */

  estado_recorrido: {
    type:
      DataTypes.ENUM(
        'EN_CURSO',
        'PAUSADO',
        'FINALIZADO',
        'CANCELADO',
      ),

    allowNull: false,
    defaultValue:
      'EN_CURSO',
  },

  /*
  |--------------------------------------------------------------------------
  | Fechas reales
  |--------------------------------------------------------------------------
  */

  fecha_hora_inicio: {
    type:
      DataTypes.DATE,

    allowNull: false,
    defaultValue:
      DataTypes.NOW,
  },

  fecha_hora_finalizacion: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Ubicación inicial
  |--------------------------------------------------------------------------
  */

  latitud_inicio: {
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

  longitud_inicio: {
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

  precision_inicio: {
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
      'Precisión GPS inicial expresada en metros.',
  },

  /*
  |--------------------------------------------------------------------------
  | Ubicación final
  |--------------------------------------------------------------------------
  */

  latitud_finalizacion: {
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

  longitud_finalizacion: {
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

  precision_finalizacion: {
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
      'Precisión GPS final expresada en metros.',
  },

  /*
  |--------------------------------------------------------------------------
  | Kilometraje
  |--------------------------------------------------------------------------
  */

  kilometraje_inicio: {
    type:
      DataTypes.DECIMAL(
        12,
        2,
      ),

    allowNull: true,

    validate: {
      min: 0,
    },
  },

  kilometraje_final: {
    type:
      DataTypes.DECIMAL(
        12,
        2,
      ),

    allowNull: true,

    validate: {
      min: 0,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Resultados calculados
  |--------------------------------------------------------------------------
  */

  distancia_recorrida_metros: {
    type:
      DataTypes.DECIMAL(
        14,
        2,
      ),

    allowNull: true,

    validate: {
      min: 0,
    },

    comment:
      'Distancia calculada utilizando las posiciones GPS.',
  },

  duracion_segundos: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Observaciones
  |--------------------------------------------------------------------------
  */

  observacion_inicio: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },

  observacion_finalizacion: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },

  motivo_cancelacion: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Estado lógico
  |--------------------------------------------------------------------------
  */

  estado: {
    type:
      DataTypes.BOOLEAN,

    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName:
      'recorridos',

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
          'id_programacion',
        ],
      },
      {
        fields: [
          'estado_recorrido',
        ],
      },
      {
        fields: [
          'fecha_hora_inicio',
        ],
      },
      {
        fields: [
          'id_usuario_inicio',
        ],
      },
    ],
  },
);

module.exports = Recorrido;