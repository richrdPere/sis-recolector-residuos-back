const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// ==========================================================
// MODELO: INCIDENCIA ARCHIVO
// ==========================================================
const IncidenciaArchivo = sequelize.define("IncidenciaArchivo", {
  id_incidencia_archivo: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_incidencia: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  // Usuario que incorpora la evidencia.
  id_usuario_carga: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  tipo_archivo: {
    type: DataTypes.ENUM(
      "IMAGEN",
      "VIDEO",
      "AUDIO",
      "DOCUMENTO",
    ),
    allowNull: false,
  },

  nombre_original: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },

  nombre_archivo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },

  almacenamiento: {
    type: DataTypes.ENUM("LOCAL", "S3"),
    allowNull: false,
    defaultValue: "LOCAL",
  },

  ruta_archivo: {
    type: DataTypes.STRING(1024),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },

  mime_type: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },

  tamanio_bytes: {
    type: DataTypes.BIGINT,
    allowNull: false,
    validate: {
      min: 1,
    },
  },

  descripcion: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName: "incidencia_archivos",

    timestamps: true,
    paranoid: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",

    indexes: [
      {
        fields: ["id_incidencia", "estado"],
      },
      {
        fields: ["id_usuario_carga"],
      },
    ],
  },
);

module.exports = IncidenciaArchivo;