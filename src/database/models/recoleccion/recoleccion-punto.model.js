const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const RecoleccionPunto = sequelize.define('RecoleccionPunto', {
  id_recoleccion: {
    type:
      DataTypes.BIGINT,

    primaryKey:
      true,

    autoIncrement:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Recorrido donde se realizó la recolección
  |--------------------------------------------------------------------------
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
  | Punto perteneciente a la versión de ruta
  |--------------------------------------------------------------------------
  */

  id_ruta_punto: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

    references: {
      model:
        'ruta_puntos',

      key:
        'id_ruta_punto',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que registró la atención
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
  | Fechas
  |--------------------------------------------------------------------------
  |
  | fecha_dispositivo indica cuándo ocurrió la atención.
  | fecha_recepcion indica cuándo fue recibida por el backend.
  |
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

    defaultValue:
      DataTypes.NOW,
  },

  /*
  |--------------------------------------------------------------------------
  | Ubicación de la atención
  |--------------------------------------------------------------------------
  |
  | La ubicación es recomendable, pero puede faltar si el dispositivo no
  | logra obtener señal GPS. Si se envía latitud, también debe enviarse
  | longitud y viceversa.
  |
  */

  latitud: {
    type:
      DataTypes.DECIMAL(
        10,
        7,
      ),

    allowNull:
      true,

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
      true,

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

    comment:
      'Precisión horizontal expresada en metros.',
  },

  distancia_punto_metros: {
    type:
      DataTypes.DECIMAL(
        10,
        2,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'La distancia al punto no puede ser negativa.',
      },
    },

    comment:
      'Distancia calculada entre la ubicación registrada y el punto configurado.',
  },

  dentro_radio_permitido: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      true,

    comment:
      'Indica si la atención fue registrada dentro del radio permitido.',
  },

  /*
  |--------------------------------------------------------------------------
  | Cantidad recolectada
  |--------------------------------------------------------------------------
  |
  | Es opcional porque durante la operación puede no ser viable estimar
  | la cantidad exacta en cada punto. Si se registra una cantidad, también
  | debe indicarse su unidad de medida.
  |
  */

  cantidad_recolectada: {
    type:
      DataTypes.DECIMAL(
        14,
        3,
      ),

    allowNull:
      true,

    validate: {
      min: {
        args: [0],

        msg:
          'La cantidad recolectada no puede ser negativa.',
      },
    },
  },

  unidad_medida: {
    type:
      DataTypes.ENUM(
        'KG',
        'TONELADA',
        'LITRO',
        'M3',
      ),

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Observación
  |--------------------------------------------------------------------------
  */

  observacion: {
    type:
      DataTypes.TEXT,

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Idempotencia
  |--------------------------------------------------------------------------
  */

  clave_idempotencia: {
    type:
      DataTypes.STRING(
        100,
      ),

    allowNull:
      false,
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
        'WEB',
        'SISTEMA',
        'API',
      ),

    allowNull:
      false,

    defaultValue:
      'MOVIL',
  },

  /*
  |--------------------------------------------------------------------------
  | Estado lógico y anulación
  |--------------------------------------------------------------------------
  |
  | Una recolección no se elimina físicamente. Si fue registrada por
  | error, se anula conservando la trazabilidad.
  |
  */

  estado_recoleccion: {
    type:
      DataTypes.ENUM(
        'REGISTRADA',
        'ANULADA',
      ),

    allowNull:
      false,

    defaultValue:
      'REGISTRADA',
  },

  motivo_anulacion: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull:
      true,
  },

  fecha_anulacion: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  id_usuario_anulacion: {
    type:
      DataTypes.BIGINT,

    allowNull:
      true,

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
},
  {
    tableName:
      'recoleccion_puntos',

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    /*
    | No se usa paranoid porque el registro debe
    | conservarse y anularse mediante su estado.
    */

    indexes: [
      {
        unique:
          true,

        fields: [
          'clave_idempotencia',
        ],

        name:
          'uk_recoleccion_idempotencia',
      },
      {
        fields: [
          'id_recorrido',
          'id_ruta_punto',
          'estado_recoleccion',
        ],

        name:
          'idx_recoleccion_recorrido_punto',
      },
      {
        fields: [
          'id_recorrido',
          'fecha_dispositivo',
        ],

        name:
          'idx_recoleccion_recorrido_fecha',
      },
      {
        fields: [
          'id_usuario',
          'fecha_dispositivo',
        ],

        name:
          'idx_recoleccion_usuario_fecha',
      },
      {
        fields: [
          'estado_recoleccion',
        ],

        name:
          'idx_recoleccion_estado',
      },
      {
        fields: [
          'fecha_recepcion',
        ],

        name:
          'idx_recoleccion_recepcion',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Latitud y longitud deben enviarse juntas
      |--------------------------------------------------------------------------
      */

      ubicacionCompleta() {
        const hasLatitude =
          this.latitud !==
          null &&
          this.latitud !==
          undefined;

        const hasLongitude =
          this.longitud !==
          null &&
          this.longitud !==
          undefined;

        if (
          hasLatitude !==
          hasLongitude
        ) {
          throw new Error(
            'La latitud y longitud deben registrarse juntas.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Cantidad y unidad deben enviarse juntas
      |--------------------------------------------------------------------------
      */

      cantidadCompleta() {
        const hasAmount =
          this
            .cantidad_recolectada !==
          null &&
          this
            .cantidad_recolectada !==
          undefined;

        const hasUnit =
          this.unidad_medida !==
          null &&
          this.unidad_medida !==
          undefined;

        if (
          hasAmount !==
          hasUnit
        ) {
          throw new Error(
            'La cantidad recolectada y su unidad de medida deben registrarse juntas.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Anulación completa
      |--------------------------------------------------------------------------
      */

      anulacionCompleta() {
        if (
          this
            .estado_recoleccion ===
          'ANULADA'
        ) {
          if (
            !this
              .motivo_anulacion
              ?.trim()
          ) {
            throw new Error(
              'Debe indicar el motivo de anulación.',
            );
          }

          if (
            !this
              .fecha_anulacion
          ) {
            throw new Error(
              'Debe registrar la fecha de anulación.',
            );
          }

          if (
            !this
              .id_usuario_anulacion
          ) {
            throw new Error(
              'Debe registrar al usuario responsable de la anulación.',
            );
          }
        }
      },
    },
  },
);

module.exports = RecoleccionPunto;