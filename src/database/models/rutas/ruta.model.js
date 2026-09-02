const {
  DataTypes,
} = require('sequelize');

const sequelize = require(
  '../../../config/database',
);

const Ruta = sequelize.define('Ruta', {
  id_ruta: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
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

  codigo: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,

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
          'El código de la ruta es obligatorio.',
      },

      len: {
        args: [2, 30],
        msg:
          'El código debe tener entre 2 y 30 caracteres.',
      },
    },
  },

  nombre: {
    type: DataTypes.STRING(120),
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
          'El nombre de la ruta es obligatorio.',
      },

      len: {
        args: [2, 120],
        msg:
          'El nombre debe tener entre 2 y 120 caracteres.',
      },
    },
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#388E3C',

    set(value) {
      this.setDataValue(
        'color',
        String(
          value || '#388E3C',
        )
          .trim()
          .toUpperCase(),
      );
    },

    validate: {
      is: {
        args: [
          /^#[0-9A-Fa-f]{6}$/,
        ],

        msg:
          'El color debe tener formato hexadecimal.',
      },
    },
  },

  estado_ruta: {
    type: DataTypes.ENUM(
      'BORRADOR',
      'ACTIVA',
      'INACTIVA',
    ),

    allowNull: false,
    defaultValue: 'BORRADOR',
  },

  /*
  |--------------------------------------------------------------------------
  | Estado administrativo
  |--------------------------------------------------------------------------
  */

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName: 'rutas',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        unique: true,
        fields: ['codigo'],
        name:
          'uk_rutas_codigo',
      },
      {
        fields: ['id_zona'],
        name:
          'idx_rutas_zona',
      },
      {
        fields: [
          'estado_ruta',
        ],
        name:
          'idx_rutas_estado_ruta',
      },
      {
        fields: [
          'id_zona',
          'estado',
        ],
        name:
          'idx_rutas_zona_estado',
      },
    ],
  },
);

module.exports = Ruta;