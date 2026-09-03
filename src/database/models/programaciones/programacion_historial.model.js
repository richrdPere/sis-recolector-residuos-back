const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const ProgramacionHistorial = sequelize.define('ProgramacionHistorial', {
  id_historial: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_programacion: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model:
        'programacion_rutas',

      key:
        'id_programacion',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario responsable
  |--------------------------------------------------------------------------
  |
  | Puede ser null si la acción fue automática.
  |
  */

  id_usuario: {
    type: DataTypes.BIGINT,
    allowNull: true,

    references: {
      model: 'usuarios',
      key: 'id_usuario',
    },

    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },

  tipo_evento: {
    type: DataTypes.ENUM(
      'CREACION',
      'ACTUALIZACION',
      'ASIGNACION_PERSONAL',
      'RETIRO_PERSONAL',
      'CAMBIO_VEHICULO',
      'CAMBIO_RUTA',
      'CAMBIO_HORARIO',
      'CAMBIO_ESTADO',
      'ACEPTACION',
      'RECHAZO',
      'CANCELACION',
    ),

    allowNull: false,
  },

  estado_anterior: {
    type: DataTypes.ENUM(
      'PROGRAMADA',
      'ASIGNADA',
      'ACEPTADA',
      'EN_CURSO',
      'PAUSADA',
      'FINALIZADA',
      'CANCELADA',
    ),

    allowNull: true,
  },

  estado_nuevo: {
    type: DataTypes.ENUM(
      'PROGRAMADA',
      'ASIGNADA',
      'ACEPTADA',
      'EN_CURSO',
      'PAUSADA',
      'FINALIZADA',
      'CANCELADA',
    ),

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Snapshot de los cambios
  |--------------------------------------------------------------------------
  */

  datos_anteriores: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  datos_nuevos: {
    type: DataTypes.JSON,
    allowNull: true,
  },

  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  origen: {
    type: DataTypes.ENUM(
      'WEB',
      'MOVIL',
      'SISTEMA',
      'API',
    ),

    allowNull: false,
    defaultValue: 'SISTEMA',
  },

  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },

  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
},
  {
    tableName: 'programacion_historial',

    /*
    |--------------------------------------------------------------------------
    | Historial inmutable
    |--------------------------------------------------------------------------
    |
    | Solo se registra created_at. No se actualiza ni elimina ordinariamente.
    |
    */

    timestamps: true,

    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
      {
        fields: [
          'id_programacion',
        ],

        name:
          'idx_historial_programacion',
      },
      {
        fields: [
          'id_usuario',
        ],

        name:
          'idx_historial_usuario',
      },
      {
        fields: [
          'tipo_evento',
        ],

        name:
          'idx_historial_evento',
      },
      {
        fields: [
          'created_at',
        ],

        name:
          'idx_historial_fecha',
      },
      {
        fields: [
          'id_programacion',
          'created_at',
        ],

        name:
          'idx_historial_programacion_fecha',
      },
    ],
  },
);

module.exports = ProgramacionHistorial;