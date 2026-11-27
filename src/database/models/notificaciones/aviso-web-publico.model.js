const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

module.exports = sequelize.define(
  'AvisoWebPublico',
  {
    id_aviso: {
      type: DataTypes.CHAR(64),
      primaryKey: true,
      allowNull: false,
    },

    id_suscripcion: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    evento: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },

    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    estado: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'PENDIENTE',
    },

    fecha_expiracion: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    fecha_proceso: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    detalle: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: 'avisos_web_publicos',

    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      {
        fields: ['estado', 'created_at'],
      },
      {
        fields: ['id_suscripcion'],
      },
    ],
  },
);