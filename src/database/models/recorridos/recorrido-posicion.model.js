const { DataTypes, } = require('sequelize');
const sequelize = require('../../../config/database');

const RecorridoPosicion = sequelize.define('RecorridoPosicion', {
  id_posicion: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Recorrido
  |--------------------------------------------------------------------------
  */

  id_recorrido: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'recorridos',
      key: 'id_recorrido',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que transmitió la ubicación
  |--------------------------------------------------------------------------
  */
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
  | Coordenadas
  |--------------------------------------------------------------------------
  */
  latitud: {
    type: DataTypes.DECIMAL(10, 7,),
    allowNull: false,
    validate: {
      min: {
        args: [-90],
        msg: 'La latitud no puede ser menor que -90.',
      },
      max: {
        args: [90],
        msg: 'La latitud no puede ser mayor que 90.',
      },
    },
  },

  longitud: {
    type: DataTypes.DECIMAL(10, 7,),
    allowNull: false,
    validate: {
      min: {
        args: [-180],
        msg: 'La longitud no puede ser menor que -180.',
      },
      max: {
        args: [180],
        msg: 'La longitud no puede ser mayor que 180.',
      },
    },
  },

  precision_gps: {
    type: DataTypes.DECIMAL(8, 2,),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'La precisión GPS no puede ser negativa.',
      },
    },
    comment: 'Precisión horizontal reportada por el dispositivo, expresada en metros.',
  },

  altitud: {
    type: DataTypes.DECIMAL(10, 2,),
    allowNull: true,
    comment: 'Altitud reportada por el dispositivo, expresada en metros.',
  },

  /*
  |--------------------------------------------------------------------------
  | Movimiento
  |--------------------------------------------------------------------------
  */
  velocidad_mps: {
    type: DataTypes.DECIMAL(8, 2,),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'La velocidad no puede ser negativa.',
      },
    },
    comment: 'Velocidad expresada en metros por segundo.',
  },

  rumbo: {
    type: DataTypes.DECIMAL(6, 2,),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'El rumbo no puede ser menor que 0 grados.',
      },

      max: {
        args: [360],
        msg: 'El rumbo no puede ser mayor que 360 grados.',
      },
    },
    comment: 'Dirección del movimiento expresada en grados.',
  },

  /*
  |--------------------------------------------------------------------------
  | Información del dispositivo
  |--------------------------------------------------------------------------
  */
  nivel_bateria: {
    type: DataTypes.DECIMAL(5, 2,),
    allowNull: true,
    validate: {
      min: {
        args: [0],
        msg: 'El nivel de batería no puede ser menor que 0.',
      },

      max: {
        args: [100],
        msg: 'El nivel de batería no puede ser mayor que 100.',
      },
    },
    comment: 'Porcentaje de batería del dispositivo al capturar la posición.',
  },

  es_ubicacion_simulada: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si el sistema operativo reportó la ubicación como simulada.',
  },

  /*
  |--------------------------------------------------------------------------
  | Fechas
  |--------------------------------------------------------------------------
  |
  | fecha_dispositivo indica cuándo fue capturada la posición.
  | fecha_recepcion indica cuándo fue recibida por el backend.
  |
  */

  fecha_dispositivo: {
    type: DataTypes.DATE,
    allowNull: false,
  },

  fecha_recepcion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  /*
  |--------------------------------------------------------------------------
  | Idempotencia
  |--------------------------------------------------------------------------
  |
  | La aplicación móvil genera una clave única para cada posición. Esto
  | evita duplicados cuando se sincroniza después de trabajar sin conexión.
  |
  */
  clave_idempotencia: {
    type: DataTypes.STRING(100,),
    allowNull: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Validación de la posición
  |--------------------------------------------------------------------------
  */
  es_valida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

  motivo_invalidez: {
    type: DataTypes.STRING(500,),
    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Origen
  |--------------------------------------------------------------------------
  */
  origen: {
    type:
      DataTypes.ENUM(
        'MOVIL',
        'SISTEMA',
        'API',
      ),
    allowNull: false,
    defaultValue: 'MOVIL',
  },
},
  {
    tableName: 'recorrido_posiciones',

    /*
    |--------------------------------------------------------------------------
    | Registro inmutable
    |--------------------------------------------------------------------------
    |
    | Las posiciones no se actualizan ni eliminan ordinariamente.
    |
    */

    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
      {
        unique:
          true,

        fields: [
          'clave_idempotencia',
        ],

        name:
          'uk_recorrido_posicion_idempotencia',
      },
      {
        fields: [
          'id_recorrido',
          'fecha_dispositivo',
        ],

        name:
          'idx_posicion_recorrido_fecha',
      },
      {
        fields: [
          'id_recorrido',
          'fecha_recepcion',
        ],

        name:
          'idx_posicion_recorrido_recepcion',
      },
      {
        fields: [
          'id_usuario',
          'fecha_dispositivo',
        ],

        name:
          'idx_posicion_usuario_fecha',
      },
      {
        fields: [
          'es_valida',
        ],

        name:
          'idx_posicion_valida',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Motivo de invalidez
      |--------------------------------------------------------------------------
      */

      invalidPositionReason() {
        if (
          this.es_valida ===
          false &&
          !this
            .motivo_invalidez
            ?.trim()
        ) {
          throw new Error(
            'Debe indicar el motivo por el que la posición fue marcada como inválida.',
          );
        }
      },
    },
  },
);

module.exports = RecorridoPosicion;