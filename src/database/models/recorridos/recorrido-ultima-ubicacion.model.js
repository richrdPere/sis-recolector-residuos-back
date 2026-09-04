const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const RecorridoUltimaUbicacion = sequelize.define('RecorridoUltimaUbicacion', {
  id_ultima_ubicacion: {
    type:
      DataTypes.BIGINT,

    primaryKey:
      true,

    autoIncrement:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Recorrido
  |--------------------------------------------------------------------------
  |
  | Solo puede existir una última ubicación por recorrido.
  |
  */

  id_recorrido: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

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
  | Posición histórica de origen
  |--------------------------------------------------------------------------
  */

  id_posicion: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

    references: {
      model:
        'recorrido_posiciones',

      key:
        'id_posicion',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que transmitió la última posición
  |--------------------------------------------------------------------------
  */

  id_usuario: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

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
  | Coordenadas actuales
  |--------------------------------------------------------------------------
  */

  latitud: {
    type:
      DataTypes.DECIMAL(
        10,
        7,
      ),

    allowNull:
      false,

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
    type:
      DataTypes.DECIMAL(
        10,
        7,
      ),

    allowNull:
      false,

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

  precision_gps: {
    type:
      DataTypes.DECIMAL(
        8,
        2,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'La precisión GPS no puede ser negativa.',
      },
    },
  },

  altitud: {
    type:
      DataTypes.DECIMAL(
        10,
        2,
      ),

    allowNull:
      true,
  },

  velocidad_mps: {
    type:
      DataTypes.DECIMAL(
        8,
        2,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'La velocidad no puede ser negativa.',
      },
    },
  },

  rumbo: {
    type:
      DataTypes.DECIMAL(
        6,
        2,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'El rumbo no puede ser menor que 0 grados.',
      },

      max: {
        args: [360],

        msg:
          'El rumbo no puede ser mayor que 360 grados.',
      },
    },
  },

  nivel_bateria: {
    type:
      DataTypes.DECIMAL(
        5,
        2,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'El nivel de batería no puede ser menor que 0.',
      },

      max: {
        args: [100],

        msg:
          'El nivel de batería no puede ser mayor que 100.',
      },
    },
  },

  es_ubicacion_simulada: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      false,

    defaultValue:
      false,
  },

  /*
  |--------------------------------------------------------------------------
  | Fechas
  |--------------------------------------------------------------------------
  */

  fecha_dispositivo: {
    type:
      DataTypes.DATE,

    allowNull:
      false,
  },

  fecha_recepcion: {
    type:
      DataTypes.DATE,

    allowNull:
      false,
  },
},
  {
    tableName:
      'recorrido_ultimas_ubicaciones',

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    indexes: [
      {
        unique:
          true,

        fields: [
          'id_recorrido',
        ],

        name:
          'uk_ultima_ubicacion_recorrido',
      },
      {
        fields: [
          'id_posicion',
        ],

        name:
          'idx_ultima_ubicacion_posicion',
      },
      {
        fields: [
          'id_usuario',
        ],

        name:
          'idx_ultima_ubicacion_usuario',
      },
      {
        fields: [
          'fecha_dispositivo',
        ],

        name:
          'idx_ultima_ubicacion_fecha_dispositivo',
      },
      {
        fields: [
          'fecha_recepcion',
        ],

        name:
          'idx_ultima_ubicacion_fecha_recepcion',
      },
    ],
  },
);

module.exports = RecorridoUltimaUbicacion;