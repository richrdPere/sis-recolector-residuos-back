const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const ProgramacionRuta = sequelize.define('ProgramacionRuta', {
  id_programacion: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Ruta programada
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Versión exacta utilizada
  |--------------------------------------------------------------------------
  |
  | Aunque la ruta cambie en el futuro, la programación conservará el
  | recorrido con el que fue creada.
  |
  */

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

  /*
  |--------------------------------------------------------------------------
  | Vehículo asignado
  |--------------------------------------------------------------------------
  */

  id_vehiculo: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model: 'vehiculos',
      key: 'id_vehiculo',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que creó la programación
  |--------------------------------------------------------------------------
  */

  id_usuario_creacion: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model: 'usuarios',
      key: 'id_usuario',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  fecha_programada: {
    type: DataTypes.DATEONLY,
    allowNull: false,

    validate: {
      isDate: {
        msg:
          'La fecha programada no es válida.',
      },
    },
  },

  hora_inicio_programada: {
    type: DataTypes.TIME,
    allowNull: false,
  },

  hora_fin_programada: {
    type: DataTypes.TIME,
    allowNull: false,
  },

  turno: {
    type: DataTypes.ENUM(
      'MANANA',
      'TARDE',
      'NOCHE',
    ),

    allowNull: true,
  },

  estado_programacion: {
    type: DataTypes.ENUM(
      'PROGRAMADA',
      'ASIGNADA',
      'ACEPTADA',
      'EN_CURSO',
      'PAUSADA',
      'FINALIZADA',
      'CANCELADA',
    ),

    allowNull: false,
    defaultValue: 'PROGRAMADA',
  },

  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  motivo_cancelacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  fecha_cancelacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
},
  {
    tableName:
      'programacion_rutas',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        fields: [
          'id_ruta',
        ],

        name:
          'idx_programacion_ruta',
      },
      {
        fields: [
          'id_ruta_version',
        ],

        name:
          'idx_programacion_version',
      },
      {
        fields: [
          'id_vehiculo',
        ],

        name:
          'idx_programacion_vehiculo',
      },
      {
        fields: [
          'fecha_programada',
        ],

        name:
          'idx_programacion_fecha',
      },
      {
        fields: [
          'estado_programacion',
        ],

        name:
          'idx_programacion_estado',
      },
      {
        fields: [
          'id_vehiculo',
          'fecha_programada',
          'hora_inicio_programada',
          'hora_fin_programada',
        ],

        name:
          'idx_programacion_conflicto_vehiculo',
      },
      {
        fields: [
          'id_ruta',
          'fecha_programada',
        ],

        name:
          'idx_programacion_ruta_fecha',
      },
      {
        fields: [
          'id_usuario_creacion',
        ],

        name:
          'idx_programacion_usuario',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Validar rango horario
      |--------------------------------------------------------------------------
      |
      | Esta primera versión considera que la jornada comienza y termina
      | en el mismo día.
      |
      */

      horarioProgramadoValido() {
        if (
          this
            .hora_inicio_programada &&
          this
            .hora_fin_programada &&
          String(
            this
              .hora_fin_programada,
          ) <=
          String(
            this
              .hora_inicio_programada,
          )
        ) {
          throw new Error(
            'La hora final programada debe ser posterior a la hora inicial.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Validar cancelación
      |--------------------------------------------------------------------------
      */

      cancelacionCompleta() {
        if (
          this
            .estado_programacion ===
          'CANCELADA'
        ) {
          if (
            !this
              .motivo_cancelacion
          ) {
            throw new Error(
              'Debe indicar el motivo de cancelación.',
            );
          }

          if (
            !this
              .fecha_cancelacion
          ) {
            throw new Error(
              'Debe registrar la fecha de cancelación.',
            );
          }
        }
      },
    },
  },
);

module.exports = ProgramacionRuta;