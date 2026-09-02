const {
  DataTypes,
} = require('sequelize');

const sequelize = require(
  '../../../config/database',
);

const validateCoordinate = (
  coordinate,
) => {
  if (
    !Array.isArray(coordinate) ||
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
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error(
      'La longitud debe estar entre -180 y 180.',
    );
  }

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new Error(
      'La latitud debe estar entre -90 y 90.',
    );
  }
};

const validatePolygon = (
  geometry,
) => {
  if (
    !geometry ||
    typeof geometry !== 'object'
  ) {
    throw new Error(
      'El polígono debe ser un objeto GeoJSON.',
    );
  }

  if (
    ![
      'Polygon',
      'MultiPolygon',
    ].includes(geometry.type)
  ) {
    throw new Error(
      'La geometría de la zona debe ser Polygon o MultiPolygon.',
    );
  }

  if (
    !Array.isArray(
      geometry.coordinates,
    ) ||
    !geometry.coordinates.length
  ) {
    throw new Error(
      'El polígono debe contener coordenadas.',
    );
  }

  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.coordinates;

  polygons.forEach(
    (polygon) => {
      if (
        !Array.isArray(polygon) ||
        !polygon.length
      ) {
        throw new Error(
          'Cada polígono debe contener al menos un anillo.',
        );
      }

      polygon.forEach(
        (ring) => {
          if (
            !Array.isArray(ring) ||
            ring.length < 4
          ) {
            throw new Error(
              'Cada anillo debe contener al menos cuatro coordenadas.',
            );
          }

          ring.forEach(
            validateCoordinate,
          );

          const first =
            ring[0];

          const last =
            ring[
            ring.length - 1
            ];

          if (
            Number(first[0]) !==
            Number(last[0]) ||
            Number(first[1]) !==
            Number(last[1])
          ) {
            throw new Error(
              'El primer y último punto del polígono deben ser iguales.',
            );
          }
        },
      );
    },
  );
};

const Zona = sequelize.define('Zona', {
  id_zona: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
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
          'El código de la zona es obligatorio.',
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
    unique: true,

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
          'El nombre de la zona es obligatorio.',
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
    defaultValue: '#1976D2',

    set(value) {
      this.setDataValue(
        'color',
        String(
          value || '#1976D2',
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
          'El color debe tener formato hexadecimal, por ejemplo #1976D2.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | GeoJSON Polygon o MultiPolygon
  |--------------------------------------------------------------------------
  */

  poligono_geojson: {
    type: DataTypes.JSON,
    allowNull: true,

    validate: {
      isValidPolygon(value) {
        if (
          value !== null &&
          value !== undefined
        ) {
          validatePolygon(
            value,
          );
        }
      },
    },
  },

  centro_latitud: {
    type: DataTypes.DECIMAL(
      10,
      7,
    ),

    allowNull: true,

    validate: {
      min: {
        args: [-90],
        msg:
          'La latitud central no puede ser menor que -90.',
      },

      max: {
        args: [90],
        msg:
          'La latitud central no puede ser mayor que 90.',
      },
    },
  },

  centro_longitud: {
    type: DataTypes.DECIMAL(
      10,
      7,
    ),

    allowNull: true,

    validate: {
      min: {
        args: [-180],
        msg:
          'La longitud central no puede ser menor que -180.',
      },

      max: {
        args: [180],
        msg:
          'La longitud central no puede ser mayor que 180.',
      },
    },
  },

  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName: 'zonas',

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
          'uk_zonas_codigo',
      },
      {
        unique: true,
        fields: ['nombre'],
        name:
          'uk_zonas_nombre',
      },
      {
        fields: ['estado'],
        name:
          'idx_zonas_estado',
      },
    ],

    validate: {
      centroCompleto() {
        const hasLatitude =
          this.centro_latitud !==
          null &&
          this.centro_latitud !==
          undefined;

        const hasLongitude =
          this.centro_longitud !==
          null &&
          this.centro_longitud !==
          undefined;

        if (
          hasLatitude !==
          hasLongitude
        ) {
          throw new Error(
            'Debe registrar conjuntamente la latitud y longitud central.',
          );
        }
      },
    },
  },
);

module.exports = Zona;