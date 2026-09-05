const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const CiudadanoDomicilio = sequelize.define('CiudadanoDomicilio', {
  id_domicilio: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  id_ciudadano: {
    type:
      DataTypes.BIGINT,

    allowNull: false,

    references: {
      model:
        'ciudadanos',

      key:
        'id_ciudadano',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Zona y ruta asociadas
  |--------------------------------------------------------------------------
  */

  id_zona: {
    type:
      DataTypes.BIGINT,

    allowNull: false,

    references: {
      model:
        'zonas',

      key:
        'id_zona',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  id_ruta: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

    references: {
      model:
        'rutas',

      key:
        'id_ruta',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'SET NULL',
  },

  /*
  |--------------------------------------------------------------------------
  | Información del domicilio
  |--------------------------------------------------------------------------
  */

  nombre_domicilio: {
    type:
      DataTypes.STRING(100),

    allowNull: false,
    defaultValue:
      'Domicilio principal',

    validate: {
      notEmpty: {
        msg:
          'El nombre del domicilio es obligatorio.',
      },

      len: {
        args: [
          2,
          100,
        ],

        msg:
          'El nombre del domicilio debe tener entre 2 y 100 caracteres.',
      },
    },
  },

  direccion: {
    type:
      DataTypes.STRING(300),

    allowNull: false,

    validate: {
      notEmpty: {
        msg:
          'La dirección es obligatoria.',
      },

      len: {
        args: [
          5,
          300,
        ],

        msg:
          'La dirección debe tener entre 5 y 300 caracteres.',
      },
    },
  },

  referencia: {
    type:
      DataTypes.STRING(300),

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Geolocalización
  |--------------------------------------------------------------------------
  */

  latitud: {
    type:
      DataTypes.DECIMAL(
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
    type:
      DataTypes.DECIMAL(
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

  precision_ubicacion: {
    type:
      DataTypes.DECIMAL(
        8,
        2,
      ),

    allowNull: true,

    validate: {
      min: {
        args: [0],

        msg:
          'La precisión no puede ser negativa.',
      },
    },

    comment:
      'Precisión de la ubicación expresada en metros.',
  },

  origen_ubicacion: {
    type:
      DataTypes.ENUM(
        'GPS',
        'MAPA',
        'DIRECCION',
        'ADMINISTRATIVO',
      ),

    allowNull: false,
    defaultValue:
      'MAPA',
  },

  /*
  |--------------------------------------------------------------------------
  | Domicilio principal
  |--------------------------------------------------------------------------
  |
  | La regla de un solo domicilio principal por ciudadano debe aplicarse
  | desde el service mediante una transacción.
  |
  */

  es_principal: {
    type:
      DataTypes.BOOLEAN,

    allowNull: false,
    defaultValue: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Validación administrativa
  |--------------------------------------------------------------------------
  */

  ubicacion_validada: {
    type:
      DataTypes.BOOLEAN,

    allowNull: false,
    defaultValue: false,
  },

  fecha_validacion: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  id_usuario_validacion: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

    references: {
      model:
        'usuarios',

      key:
        'id_usuario',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'SET NULL',
  },

  /*
  |--------------------------------------------------------------------------
  | Estado
  |--------------------------------------------------------------------------
  */

  estado_domicilio: {
    type:
      DataTypes.ENUM(
        'ACTIVO',
        'INACTIVO',
      ),

    allowNull: false,
    defaultValue:
      'ACTIVO',
  },

  observacion: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },
},
  {
    tableName:
      'ciudadano_domicilios',

    timestamps: true,
    paranoid: true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    deletedAt:
      'deleted_at',

    indexes: [
      {
        fields: [
          'id_ciudadano',
        ],

        name:
          'idx_domicilio_ciudadano',
      },
      {
        fields: [
          'id_zona',
        ],

        name:
          'idx_domicilio_zona',
      },
      {
        fields: [
          'id_ruta',
        ],

        name:
          'idx_domicilio_ruta',
      },
      {
        fields: [
          'id_ciudadano',
          'es_principal',
        ],

        name:
          'idx_domicilio_principal',
      },
      {
        fields: [
          'estado_domicilio',
        ],

        name:
          'idx_domicilio_estado',
      },
      {
        fields: [
          'latitud',
          'longitud',
        ],

        name:
          'idx_domicilio_coordenadas',
      },
      {
        fields: [
          'id_zona',
          'estado_domicilio',
        ],

        name:
          'idx_domicilio_zona_estado',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Coordenadas completas
      |--------------------------------------------------------------------------
      */

      coordenadasCompletas() {
        const tieneLatitud =
          this.latitud !==
          null &&
          this.latitud !==
          undefined;

        const tieneLongitud =
          this.longitud !==
          null &&
          this.longitud !==
          undefined;

        if (
          tieneLatitud !==
          tieneLongitud
        ) {
          throw new Error(
            'La latitud y longitud deben registrarse conjuntamente.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Validación completa
      |--------------------------------------------------------------------------
      */

      validacionCompleta() {
        if (
          this
            .ubicacion_validada
        ) {
          if (
            !this
              .fecha_validacion
          ) {
            throw new Error(
              'Debe registrarse la fecha de validación del domicilio.',
            );
          }

          if (
            !this
              .id_usuario_validacion
          ) {
            throw new Error(
              'Debe registrarse el usuario que validó el domicilio.',
            );
          }
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Domicilio principal activo
      |--------------------------------------------------------------------------
      */

      principalActivo() {
        if (
          this.es_principal &&
          this
            .estado_domicilio !==
          'ACTIVO'
        ) {
          throw new Error(
            'Un domicilio principal debe encontrarse activo.',
          );
        }
      },
    },
  },
);

module.exports = CiudadanoDomicilio;