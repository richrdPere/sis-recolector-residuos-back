const { DataTypes, } = require('sequelize');

const sequelize = require('../../../config/database');

const RutaPunto = sequelize.define('RutaPunto', {
  id_ruta_punto: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_ruta_version: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model:
        'ruta_versiones',

      key:
        'id_ruta_version',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  codigo: {
    type: DataTypes.STRING(30),
    allowNull: false,

    set(value) {
      this.setDataValue(
        'codigo',
        String(value || '')
          .trim()
          .toUpperCase(),
      );
    },

    validate: {
      notEmpty: {
        msg:
          'El código del punto es obligatorio.',
      },

      len: {
        args: [2, 30],
        msg:
          'El código debe tener entre 2 y 30 caracteres.',
      },
    },
  },

  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,

    set(value) {
      this.setDataValue(
        'nombre',
        String(value || '')
          .trim(),
      );
    },

    validate: {
      notEmpty: {
        msg:
          'El nombre del punto es obligatorio.',
      },
    },
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  tipo_punto: {
    type: DataTypes.ENUM(
      'INICIO',
      'RECOLECCION',
      'DESCARGA',
      'FINAL',
      'REFERENCIA',
    ),

    allowNull: false,
    defaultValue:
      'RECOLECCION',
  },

  latitud: {
    type: DataTypes.DECIMAL(
      10,
      7,
    ),

    allowNull: false,

    validate: {
      min: {
        args: [-90],
        msg:
          'La latitud no puede ser menor que -90.',
      },

      max: {
        args: [90],
        msg:
          'La latitud no puede ser mayor que 90.',
      },
    },
  },

  longitud: {
    type: DataTypes.DECIMAL(
      10,
      7,
    ),

    allowNull: false,

    validate: {
      min: {
        args: [-180],
        msg:
          'La longitud no puede ser menor que -180.',
      },

      max: {
        args: [180],
        msg:
          'La longitud no puede ser mayor que 180.',
      },
    },
  },

  orden: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: false,

    validate: {
      min: {
        args: [1],
        msg:
          'El orden debe ser mayor o igual que uno.',
      },
    },
  },

  radio_atencion_metros: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: false,
    defaultValue: 30,

    validate: {
      min: {
        args: [1],
        msg:
          'El radio de atención debe ser mayor que cero.',
      },

      max: {
        args: [1000],
        msg:
          'El radio de atención no puede superar los 1000 metros.',
      },
    },
  },

  tiempo_estimado_min: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: true,

    validate: {
      min: {
        args: [1],
        msg:
          'El tiempo estimado debe ser mayor que cero.',
      },
    },
  },

  obligatorio: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName:
      'ruta_puntos',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        unique: true,

        fields: [
          'id_ruta_version',
          'codigo',
        ],

        name:
          'uk_ruta_punto_codigo',
      },
      {
        unique: true,

        fields: [
          'id_ruta_version',
          'orden',
        ],

        name:
          'uk_ruta_punto_orden',
      },
      {
        fields: [
          'id_ruta_version',
          'tipo_punto',
        ],

        name:
          'idx_punto_version_tipo',
      },
      {
        fields: [
          'latitud',
          'longitud',
        ],

        name:
          'idx_punto_coordenadas',
      },
    ],
  },
);

module.exports = RutaPunto;