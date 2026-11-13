const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const SuscripcionAlertaPublica = sequelize.define('SuscripcionAlertaPublica', {
  id_suscripcion: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
  },

  hash_clave: {
    type: DataTypes.CHAR(64),
    allowNull: false,
    unique: true,
  },

  huella_registro: {
    type: DataTypes.CHAR(64),
    allowNull: false,
  },

  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },

  celular: {
    type: DataTypes.STRING(9),
    allowNull: false,
  },

  id_zona: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model: 'zonas',
      key: 'id_zona',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  id_ruta: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model: 'rutas',
      key: 'id_ruta',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  notificar_inicio_ruta: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },

  notificar_cambios: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },

  notificar_incidencias: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },

  acepta_tratamiento_datos: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },

  fecha_consentimiento: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  version_consentimiento: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },

  texto_consentimiento: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  estado: {
    type: DataTypes.ENUM(
      'PENDIENTE_DISPOSITIVO',
      'ACTIVA',
      'BAJA',
    ),

    allowNull: false,
    defaultValue: 'PENDIENTE_DISPOSITIVO',
  },
},

  {
    tableName: 'suscripciones_alertas_publicas',

    timestamps: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      {
        fields: ['id_ruta', 'estado'],
      },
      {
        fields: ['id_zona', 'estado'],
      },
    ],
  },
);

module.exports = SuscripcionAlertaPublica;