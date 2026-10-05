const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// *********************************************************
// UTILIDADES LOCALES
// *********************************************************
const referenciaUsuario = (allowNull = true) => ({
  type: DataTypes.BIGINT,
  allowNull,

  references: {
    model: 'usuarios',
    key: 'id_usuario',
  },

  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
});

const campoTextoOpcional = (nombre, longitud = null) => ({
  type: longitud
    ? DataTypes.STRING(longitud)
    : DataTypes.TEXT,

  allowNull: true,

  set(value) {
    const normalized = value == null
      ? null
      : String(value).trim();

    this.setDataValue(nombre, normalized || null);
  },

  ...(longitud
    ? {
      validate: {
        len: {
          args: [0, longitud],
          msg: `${nombre} no puede superar ${longitud} caracteres.`,
        },
      },
    }
    : {}),
});

const campoDecimalNoNegativo = () => ({
  type: DataTypes.DECIMAL(12, 2),
  allowNull: true,

  validate: {
    isDecimal: {
      msg: 'El valor debe ser un número decimal.',
    },

    min: {
      args: [0],
      msg: 'El valor no puede ser negativo.',
    },
  },
});

// *********************************************************
// MODELO
// *********************************************************
const VehiculoMantenimiento = sequelize.define('VehiculoMantenimiento',
  {
    id_mantenimiento: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },

    /*
    |--------------------------------------------------------------------------
    | Relaciones
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

    id_usuario_creacion: referenciaUsuario(false),
    id_usuario_inicio: referenciaUsuario(),
    id_usuario_finalizacion: referenciaUsuario(),
    id_usuario_cancelacion: referenciaUsuario(),

    /*
    |--------------------------------------------------------------------------
    | Clasificación y estado
    |--------------------------------------------------------------------------
    */

    tipo_mantenimiento: {
      type: DataTypes.ENUM(
        'PREVENTIVO',
        'CORRECTIVO',
      ),

      allowNull: false,
    },

    estado_mantenimiento: {
      type: DataTypes.ENUM(
        'PROGRAMADO',
        'EN_PROCESO',
        'FINALIZADO',
        'CANCELADO',
      ),

      allowNull: false,
      defaultValue: 'PROGRAMADO',
    },

    /*
    |--------------------------------------------------------------------------
    | Fechas programadas
    |--------------------------------------------------------------------------
    */

    fecha_inicio_programada: {
      type: DataTypes.DATE,
      allowNull: false,

      validate: {
        isDate: {
          msg: 'La fecha de inicio programada no es válida.',
        },
      },
    },

    fecha_fin_programada: {
      type: DataTypes.DATE,
      allowNull: false,

      validate: {
        isDate: {
          msg: 'La fecha de fin programada no es válida.',
        },
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Fechas reales
    |--------------------------------------------------------------------------
    */

    fecha_inicio_real: {
      type: DataTypes.DATE,
      allowNull: true,

      validate: {
        isDate: {
          msg: 'La fecha de inicio real no es válida.',
        },
      },
    },

    fecha_fin_real: {
      type: DataTypes.DATE,
      allowNull: true,

      validate: {
        isDate: {
          msg: 'La fecha de fin real no es válida.',
        },
      },
    },

    /*
    |--------------------------------------------------------------------------
    | Kilometraje
    |--------------------------------------------------------------------------
    */

    kilometraje_ingreso: campoDecimalNoNegativo(),

    kilometraje_salida: campoDecimalNoNegativo(),

    /*
    |--------------------------------------------------------------------------
    | Información técnica
    |--------------------------------------------------------------------------
    */
    motivo: {
      type: DataTypes.TEXT,
      allowNull: false,

      set(value) {
        this.setDataValue(
          'motivo',
          value == null
            ? value
            : String(value).trim(),
        );
      },

      validate: {
        notEmpty: {
          msg: 'El motivo del mantenimiento es obligatorio.',
        },
      },
    },

    diagnostico: campoTextoOpcional('diagnostico'),

    trabajos_realizados: campoTextoOpcional(
      'trabajos_realizados',
    ),

    taller: campoTextoOpcional('taller', 150),

    responsable_tecnico: campoTextoOpcional(
      'responsable_tecnico',
      150,
    ),

    costo_total: campoDecimalNoNegativo(),

    /*
    |--------------------------------------------------------------------------
    | Resultado de la intervención
    |--------------------------------------------------------------------------
    |
    | null: todavía no se ha registrado el resultado.
    | true: vehículo operativo al finalizar.
    | false: vehículo continúa no operativo.
    |
    */

    vehiculo_operativo: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    },

    /*
    |--------------------------------------------------------------------------
    | Cancelación e información adicional
    |--------------------------------------------------------------------------
    */

    motivo_cancelacion: campoTextoOpcional(
      'motivo_cancelacion',
    ),

    fecha_cancelacion: {
      type: DataTypes.DATE,
      allowNull: true,

      validate: {
        isDate: {
          msg: 'La fecha de cancelación no es válida.',
        },
      },
    },

    observacion: campoTextoOpcional('observacion'),
  },
  {
    tableName: 'vehiculo_mantenimientos',

    timestamps: true,
    paranoid: false,

    createdAt: 'created_at',
    updatedAt: 'updated_at',

    /*
    |--------------------------------------------------------------------------
    | Validaciones entre campos
    |--------------------------------------------------------------------------
    */

    validate: {
      validarFechasProgramadas() {
        if (
          this.fecha_inicio_programada == null ||
          this.fecha_fin_programada == null
        ) {
          return;
        }

        const inicio = new Date(
          this.fecha_inicio_programada,
        ).getTime();

        const fin = new Date(
          this.fecha_fin_programada,
        ).getTime();

        if (fin <= inicio) {
          throw new Error(
            'La fecha de fin programada debe ser posterior al inicio.',
          );
        }
      },

      validarFechasReales() {
        if (
          this.fecha_inicio_real == null ||
          this.fecha_fin_real == null
        ) {
          return;
        }

        const inicio = new Date(
          this.fecha_inicio_real,
        ).getTime();

        const fin = new Date(
          this.fecha_fin_real,
        ).getTime();

        if (fin < inicio) {
          throw new Error(
            'La fecha de fin real no puede ser anterior al inicio.',
          );
        }
      },

      validarKilometraje() {
        if (
          this.kilometraje_ingreso == null ||
          this.kilometraje_salida == null
        ) {
          return;
        }

        if (
          Number(this.kilometraje_salida) <
          Number(this.kilometraje_ingreso)
        ) {
          throw new Error(
            'El kilometraje de salida no puede ser menor al de ingreso.',
          );
        }
      },
    },

    indexes: [
      {
        name: 'idx_mantenimiento_vehiculo_estado',
        fields: [
          'id_vehiculo',
          'estado_mantenimiento',
        ],
      },
      {
        name: 'idx_mantenimiento_vehiculo_intervalo',
        fields: [
          'id_vehiculo',
          'fecha_inicio_programada',
          'fecha_fin_programada',
        ],
      },
      {
        name: 'idx_mantenimiento_estado_inicio',
        fields: [
          'estado_mantenimiento',
          'fecha_inicio_programada',
        ],
      },
      {
        name: 'idx_mantenimiento_tipo',
        fields: ['tipo_mantenimiento'],
      },
      {
        name: 'idx_mantenimiento_usuario_creacion',
        fields: ['id_usuario_creacion'],
      },
    ],
  },
);

module.exports = VehiculoMantenimiento;