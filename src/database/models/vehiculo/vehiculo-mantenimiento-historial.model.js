const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// *********************************************************
// CONSTANTES
// *********************************************************
const ESTADOS_MANTENIMIENTO = [
  'PROGRAMADO',
  'EN_PROCESO',
  'FINALIZADO',
  'CANCELADO',
];

// *********************************************************
// MODELO
// *********************************************************

const VehiculoMantenimientoHistorial = sequelize.define('VehiculoMantenimientoHistorial', {
  id_historial: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Relaciones
  |--------------------------------------------------------------------------
  */

  id_mantenimiento: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model: 'vehiculo_mantenimientos',
      key: 'id_mantenimiento',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
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
  | Evento
  |--------------------------------------------------------------------------
  */

  tipo_evento: {
    type: DataTypes.ENUM(
      'CREACION',
      'ACTUALIZACION',
      'INICIO',
      'FINALIZACION',
      'CANCELACION',
    ),

    allowNull: false,
  },

  estado_anterior: {
    type: DataTypes.ENUM(...ESTADOS_MANTENIMIENTO),
    allowNull: true,
  },

  estado_nuevo: {
    type: DataTypes.ENUM(...ESTADOS_MANTENIMIENTO),
    allowNull: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Datos de auditoría
  |--------------------------------------------------------------------------
  |
  | Guardar solamente campos relevantes del mantenimiento.
  | No incluir contraseñas, tokens ni datos personales innecesarios.
  |
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

    set(value) {
      const normalized = value == null
        ? null
        : String(value).trim();

      this.setDataValue(
        'observacion',
        normalized || null,
      );
    },
  },
},
  {
    tableName: 'vehiculo_mantenimiento_historial',

    timestamps: true,
    paranoid: false,

    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
      {
        name: 'idx_mantenimiento_historial_orden_fecha',
        fields: [
          'id_mantenimiento',
          'created_at',
          'id_historial',
        ],
      },
      {
        name: 'idx_mantenimiento_historial_usuario',
        fields: ['id_usuario'],
      },
      {
        name: 'idx_mantenimiento_historial_evento',
        fields: ['tipo_evento'],
      },
    ],
  },
);

module.exports = VehiculoMantenimientoHistorial;