const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const validateLineString = (
  geometry,
) => {
  if (
    !geometry ||
    typeof geometry !== 'object'
  ) {
    throw new Error(
      'La geometría debe ser un objeto GeoJSON.',
    );
  }

  if (
    geometry.type !==
    'LineString'
  ) {
    throw new Error(
      'La geometría de la ruta debe ser LineString.',
    );
  }

  if (
    !Array.isArray(
      geometry.coordinates,
    ) ||
    geometry.coordinates.length <
    2
  ) {
    throw new Error(
      'La ruta debe contener al menos dos coordenadas.',
    );
  }

  geometry.coordinates.forEach(
    (coordinate) => {
      if (
        !Array.isArray(
          coordinate,
        ) ||
        coordinate.length < 2
      ) {
        throw new Error(
          'Cada coordenada debe contener longitud y latitud.',
        );
      }

      const longitude =
        Number(coordinate[0]);

      const latitude =
        Number(coordinate[1]);

      if (
        !Number.isFinite(
          longitude,
        ) ||
        longitude < -180 ||
        longitude > 180
      ) {
        throw new Error(
          'La longitud debe estar entre -180 y 180.',
        );
      }

      if (
        !Number.isFinite(
          latitude,
        ) ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new Error(
          'La latitud debe estar entre -90 y 90.',
        );
      }
    },
  );
};

const RutaVersion = sequelize.define('RutaVersion', {
  id_ruta_version: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
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

  numero_version: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: false,

    validate: {
      min: {
        args: [1],
        msg:
          'El número de versión debe ser mayor o igual que uno.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | GeoJSON LineString
  |--------------------------------------------------------------------------
  */

  geometria_geojson: {
    type: DataTypes.JSON,
    allowNull: false,

    validate: {
      isValidLineString(
        value,
      ) {
        validateLineString(
          value,
        );
      },
    },
  },

  distancia_estimada_km: {
    type: DataTypes.DECIMAL(
      10,
      2,
    ),

    allowNull: true,

    validate: {
      min: {
        args: [0],
        msg:
          'La distancia no puede ser negativa.',
      },
    },
  },

  duracion_estimada_min: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: true,

    validate: {
      min: {
        args: [1],
        msg:
          'La duración estimada debe ser mayor que cero.',
      },
    },
  },

  fecha_vigencia_desde: {
    type:
      DataTypes.DATEONLY,

    allowNull: false,

    validate: {
      isDate: {
        msg:
          'La fecha inicial de vigencia no es válida.',
      },
    },
  },

  fecha_vigencia_hasta: {
    type:
      DataTypes.DATEONLY,

    allowNull: true,

    validate: {
      isDate: {
        msg:
          'La fecha final de vigencia no es válida.',
      },
    },
  },

  vigente: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName:
      'ruta_versiones',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        unique: true,

        fields: [
          'id_ruta',
          'numero_version',
        ],

        name:
          'uk_ruta_version_numero',
      },
      {
        fields: [
          'id_ruta',
          'vigente',
        ],

        name:
          'idx_version_ruta_vigente',
      },
      {
        fields: [
          'fecha_vigencia_desde',
          'fecha_vigencia_hasta',
        ],

        name:
          'idx_version_vigencia',
      },
    ],

    validate: {
      vigenciaValida() {
        if (
          this
            .fecha_vigencia_desde &&
          this
            .fecha_vigencia_hasta &&
          new Date(
            `${this.fecha_vigencia_hasta}T00:00:00`,
          ) <
          new Date(
            `${this.fecha_vigencia_desde}T00:00:00`,
          )
        ) {
          throw new Error(
            'La fecha final de vigencia no puede ser anterior a la fecha inicial.',
          );
        }
      },
    },
  },
);

module.exports = RutaVersion;