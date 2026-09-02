const { DataTypes, } = require('sequelize');

const sequelize = require('../../../config/database');

const Vehiculo = sequelize.define('Vehiculo', {


  id_vehiculo: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },

  codigo: {
    type: DataTypes.STRING(30),
    allowNull: false,

    set(value) {
      const normalized = String(
        value || '',
      )
        .trim()
        .toUpperCase();

      this.setDataValue(
        'codigo',
        normalized,
      );
    },

    validate: {
      notEmpty: {
        msg:
          'El código del vehículo es obligatorio.',
      },

      len: {
        args: [2, 30],
        msg:
          'El código debe tener entre 2 y 30 caracteres.',
      },

      is: {
        args: /^[A-Z0-9_-]+$/,
        msg:
          'El código solo puede contener letras, números, guiones y guiones bajos.',
      },
    },
  },

  placa: {
    type: DataTypes.STRING(15),
    allowNull: false,

    set(value) {
      const normalized = String(
        value || '',
      )
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');

      this.setDataValue(
        'placa',
        normalized,
      );
    },

    validate: {
      notEmpty: {
        msg:
          'La placa del vehículo es obligatoria.',
      },

      len: {
        args: [5, 15],
        msg:
          'La placa debe tener entre 5 y 15 caracteres.',
      },

      is: {
        args: /^[A-Z0-9-]+$/,
        msg:
          'La placa solo puede contener letras, números y guiones.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Información general
  |--------------------------------------------------------------------------
  */

  marca: {
    type: DataTypes.STRING(80),
    allowNull: false,

    set(value) {
      this.setDataValue(
        'marca',
        String(value || '').trim(),
      );
    },

    validate: {
      notEmpty: {
        msg:
          'La marca es obligatoria.',
      },

      len: {
        args: [2, 80],
        msg:
          'La marca debe tener entre 2 y 80 caracteres.',
      },
    },
  },

  modelo: {
    type: DataTypes.STRING(80),
    allowNull: false,

    set(value) {
      this.setDataValue(
        'modelo',
        String(value || '').trim(),
      );
    },

    validate: {
      notEmpty: {
        msg:
          'El modelo es obligatorio.',
      },

      len: {
        args: [1, 80],
        msg:
          'El modelo puede tener hasta 80 caracteres.',
      },
    },
  },

  anio: {
    type: DataTypes.SMALLINT.UNSIGNED,
    allowNull: true,

    validate: {
      isInt: {
        msg:
          'El año debe ser un número entero.',
      },

      min: {
        args: [1950],
        msg:
          'El año del vehículo no puede ser menor a 1950.',
      },

      validarAnio(value) {
        if (value == null) {
          return;
        }

        const maxYear =
          new Date().getFullYear() + 1;

        if (Number(value) > maxYear) {
          throw new Error(
            `El año no puede ser mayor a ${maxYear}.`,
          );
        }
      },
    },
  },

  color: {
    type: DataTypes.STRING(50),
    allowNull: true,

    set(value) {
      this.setDataValue(
        'color',
        value == null
          ? null
          : String(value).trim(),
      );
    },

    validate: {
      len: {
        args: [0, 50],
        msg:
          'El color puede tener hasta 50 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Tipo de unidad
  |--------------------------------------------------------------------------
  */

  tipo_vehiculo: {
    type: DataTypes.ENUM(
      'CAMION_COMPACTADOR',
      'CAMION_BARANDA',
      'CAMION_VOLQUETE',
      'MOTOFURGON',
      'OTRO',
    ),

    allowNull: false,

    defaultValue:
      'CAMION_COMPACTADOR',
  },

  /*
  |--------------------------------------------------------------------------
  | Capacidad
  |--------------------------------------------------------------------------
  */

  capacidad_maxima: {
    type: DataTypes.DECIMAL(
      12,
      2,
    ),

    allowNull: false,

    validate: {
      isDecimal: {
        msg:
          'La capacidad máxima debe ser un número decimal.',
      },

      min: {
        args: [0.01],
        msg:
          'La capacidad máxima debe ser mayor que cero.',
      },
    },
  },

  unidad_capacidad: {
    type: DataTypes.ENUM(
      'KILOGRAMO',
      'TONELADA',
      'METRO_CUBICO',
    ),

    allowNull: false,

    defaultValue:
      'KILOGRAMO',
  },

  /*
  |--------------------------------------------------------------------------
  | Kilometraje
  |--------------------------------------------------------------------------
  */

  kilometraje: {
    type: DataTypes.DECIMAL(
      12,
      2,
    ),

    allowNull: false,

    defaultValue: 0,

    validate: {
      isDecimal: {
        msg:
          'El kilometraje debe ser un número decimal.',
      },

      min: {
        args: [0],
        msg:
          'El kilometraje no puede ser negativo.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Estado operativo
  |--------------------------------------------------------------------------
  */

  estado_operativo: {
    type: DataTypes.ENUM(
      'DISPONIBLE',
      'ASIGNADO',
      'EN_RUTA',
      'EN_MANTENIMIENTO',
      'FUERA_DE_SERVICIO',
    ),

    allowNull: false,

    defaultValue:
      'DISPONIBLE',
  },

  /*
  |--------------------------------------------------------------------------
  | Información complementaria
  |--------------------------------------------------------------------------
  */

  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,

    set(value) {
      const normalized =
        value == null
          ? null
          : String(value).trim();

      this.setDataValue(
        'observacion',
        normalized || null,
      );
    },
  },

  foto_url: {
    type: DataTypes.STRING(500),
    allowNull: true,

    validate: {
      len: {
        args: [0, 500],
        msg:
          'La URL de la fotografía puede tener hasta 500 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Estado del registro
  |--------------------------------------------------------------------------
  |
  | estado = existencia administrativa del registro.
  | estado_operativo = situación actual del vehículo.
  |
  */

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName:
      'vehiculos',

    timestamps:
      true,

    paranoid:
      true,

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
          'codigo',
        ],

        name:
          'uq_vehiculo_codigo',
      },

      {
        unique: true,
        fields: [
          'placa',
        ],

        name:
          'uq_vehiculo_placa',
      },

      {
        fields: [
          'estado',
          'estado_operativo',
        ],

        name:
          'idx_vehiculo_estado_operativo',
      },

      {
        fields: [
          'tipo_vehiculo',
        ],

        name:
          'idx_vehiculo_tipo',
      },

      {
        fields: [
          'marca',
          'modelo',
        ],

        name:
          'idx_vehiculo_marca_modelo',
      },

      {
        fields: [
          'deleted_at',
        ],

        name:
          'idx_vehiculo_deleted_at',
      },
    ],
  },
);

module.exports = Vehiculo;