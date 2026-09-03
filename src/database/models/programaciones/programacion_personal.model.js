const { DataTypes } = require('sequelize');

const sequelize = require('../../../config/database');

const ProgramacionPersonal = sequelize.define('ProgramacionPersonal', {
  id_programacion_personal: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_programacion: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model:
        'programacion_rutas',

      key:
        'id_programacion',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  id_personal: {
    type: DataTypes.BIGINT,
    allowNull: false,

    references: {
      model:
        'personal_operativo',

      key: 'id_personal',
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  funcion: {
    type: DataTypes.ENUM(
      'CONDUCTOR',
      'RECOLECTOR',
      'SUPERVISOR',
    ),

    allowNull: false,
  },

  /*
  |--------------------------------------------------------------------------
  | Personal principal
  |--------------------------------------------------------------------------
  |
  | En esta primera versión solo el conductor puede ser principal.
  | La regla de exactamente un conductor principal se aplicará en el service.
  |
  */

  es_principal: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  estado_asignacion: {
    type: DataTypes.ENUM(
      'ASIGNADO',
      'ACEPTADO',
      'RECHAZADO',
      'EN_SERVICIO',
      'FINALIZADO',
      'RETIRADO',
    ),

    allowNull: false,
    defaultValue: 'ASIGNADO',
  },

  fecha_respuesta: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
},
  {
    tableName:
      'programacion_personal',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        /*
        |--------------------------------------------------------------------------
        | Evitar que una persona se repita dentro de la misma jornada
        |--------------------------------------------------------------------------
        */

        unique: true,

        fields: [
          'id_programacion',
          'id_personal',
        ],

        name:
          'uk_programacion_personal',
      },
      {
        fields: [
          'id_programacion',
          'funcion',
        ],

        name:
          'idx_programacion_funcion',
      },
      {
        fields: [
          'id_personal',
          'estado_asignacion',
        ],

        name:
          'idx_personal_asignacion',
      },
      {
        fields: [
          'estado_asignacion',
        ],

        name:
          'idx_asignacion_estado',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Solo el conductor puede marcarse como principal
      |--------------------------------------------------------------------------
      */

      principalValido() {
        if (
          this.es_principal &&
          this.funcion !==
          'CONDUCTOR'
        ) {
          throw new Error(
            'Solo un conductor puede marcarse como personal principal.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Aceptación o rechazo requiere fecha de respuesta
      |--------------------------------------------------------------------------
      */

      respuestaCompleta() {
        if (
          [
            'ACEPTADO',
            'RECHAZADO',
          ].includes(
            this
              .estado_asignacion,
          ) &&
          !this.fecha_respuesta
        ) {
          throw new Error(
            'Debe registrar la fecha de respuesta de la asignación.',
          );
        }
      },
    },
  },
);

module.exports = ProgramacionPersonal;