const {
  DataTypes,
} = require('sequelize');

const sequelize = require(
  '../../../config/database',
);

const RutaHorario = sequelize.define('RutaHorario',
  {
    id_ruta_horario: {
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

    dia_semana: {
      type: DataTypes.ENUM(
        'LUNES',
        'MARTES',
        'MIERCOLES',
        'JUEVES',
        'VIERNES',
        'SABADO',
        'DOMINGO',
      ),

      allowNull: false,
    },

    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    frecuencia: {
      type: DataTypes.ENUM(
        'SEMANAL',
        'QUINCENAL',
        'MENSUAL',
        'ESPECIAL',
      ),

      allowNull: false,
      defaultValue: 'SEMANAL',
    },

    fecha_vigencia_desde: {
      type:
        DataTypes.DATEONLY,

      allowNull: false,

      validate: {
        isDate: {
          msg:
            'La fecha inicial no es válida.',
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
            'La fecha final no es válida.',
        },
      },
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
      'ruta_horarios',

    timestamps: true,
    paranoid: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    indexes: [
      {
        fields: [
          'id_ruta',
          'dia_semana',
        ],

        name:
          'idx_horario_ruta_dia',
      },
      {
        fields: [
          'id_ruta',
          'estado',
        ],

        name:
          'idx_horario_ruta_estado',
      },
      {
        fields: [
          'fecha_vigencia_desde',
          'fecha_vigencia_hasta',
        ],

        name:
          'idx_horario_vigencia',
      },
    ],

    validate: {
      horarioValido() {
        if (
          this.hora_inicio &&
          this.hora_fin &&
          String(
            this.hora_fin,
          ) <=
          String(
            this.hora_inicio,
          )
        ) {
          throw new Error(
            'La hora final debe ser posterior a la hora inicial.',
          );
        }
      },

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

module.exports = RutaHorario;