const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// Constants
const {
  TIPOS_REPORTE_PERMITIDOS,
  FORMATOS_EXPORTACION_PERMITIDOS,
  ESTADOS_EXPORTACION,
  ESTADOS_EXPORTACION_PERMITIDOS,
} = require('../../../modules/reportes/constants/reporte.constants');

const ReporteExportacion = sequelize.define('ReporteExportacion', {
  id_reporte_exportacion: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que solicitó la exportación
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
  | Tipo de reporte
  |--------------------------------------------------------------------------
  */

  tipo_reporte: {
    type: DataTypes.ENUM(
      ...TIPOS_REPORTE_PERMITIDOS,
    ),

    allowNull: false,

    validate: {
      notNull: {
        msg:
          'El tipo de reporte es obligatorio.',
      },

      isIn: {
        args: [
          TIPOS_REPORTE_PERMITIDOS,
        ],

        msg:
          'El tipo de reporte no es válido.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Formato generado
  |--------------------------------------------------------------------------
  */

  formato: {
    type: DataTypes.ENUM(
      ...FORMATOS_EXPORTACION_PERMITIDOS,
    ),

    allowNull: false,

    validate: {
      notNull: {
        msg:
          'El formato de exportación es obligatorio.',
      },

      isIn: {
        args: [
          FORMATOS_EXPORTACION_PERMITIDOS,
        ],

        msg:
          'El formato de exportación no es válido.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Filtros aplicados
  |--------------------------------------------------------------------------
  |
  | Ejemplo:
  |
  | {
  |   "fecha_inicio": "2026-09-01",
  |   "fecha_fin": "2026-09-30",
  |   "id_zona": 2,
  |   "estado": "FINALIZADO"
  | }
  |
  */

  filtros: {
    type: DataTypes.JSON,
    allowNull: false,

    defaultValue: {},

    validate: {
      esObjetoValido(valor) {
        if (
          valor === null
          || Array.isArray(valor)
          || typeof valor !== 'object'
        ) {
          throw new Error(
            'Los filtros deben ser un objeto válido.',
          );
        }
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Columnas exportadas
  |--------------------------------------------------------------------------
  |
  | Permite conocer qué columnas fueron incluidas.
  |
  */

  columnas: {
    type: DataTypes.JSON,
    allowNull: true,

    validate: {
      esArrayValido(valor) {
        if (
          valor !== null
          && valor !== undefined
          && !Array.isArray(valor)
        ) {
          throw new Error(
            'Las columnas deben ser un arreglo.',
          );
        }
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Información del archivo
  |--------------------------------------------------------------------------
  */

  nombre_archivo: {
    type: DataTypes.STRING(255),
    allowNull: true,

    validate: {
      len: {
        args: [1, 255],
        msg:
          'El nombre del archivo no puede superar los 255 caracteres.',
      },
    },
  },

  mime_type: {
    type: DataTypes.STRING(150),
    allowNull: true,

    validate: {
      len: {
        args: [1, 150],
        msg:
          'El tipo MIME no puede superar los 150 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Resultado de la exportación
  |--------------------------------------------------------------------------
  */

  total_registros: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    defaultValue: 0,

    validate: {
      min: {
        args: [0],
        msg:
          'El total de registros no puede ser negativo.',
      },
    },
  },

  tamano_bytes: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,

    validate: {
      min: {
        args: [0],
        msg:
          'El tamaño del archivo no puede ser negativo.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Estado de generación
  |--------------------------------------------------------------------------
  */

  estado: {
    type: DataTypes.ENUM(
      ...ESTADOS_EXPORTACION_PERMITIDOS,
    ),

    allowNull: false,

    defaultValue:
      ESTADOS_EXPORTACION.GENERANDO,

    validate: {
      notNull: {
        msg:
          'El estado de la exportación es obligatorio.',
      },

      isIn: {
        args: [
          ESTADOS_EXPORTACION_PERMITIDOS,
        ],

        msg:
          'El estado de la exportación no es válido.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Tiempos del proceso
  |--------------------------------------------------------------------------
  */

  fecha_inicio_proceso: {
    type: DataTypes.DATE,
    allowNull: false,

    defaultValue:
      DataTypes.NOW,
  },

  fecha_fin_proceso: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  duracion_ms: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: true,

    validate: {
      min: {
        args: [0],
        msg:
          'La duración no puede ser negativa.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Información del error
  |--------------------------------------------------------------------------
  */

  mensaje_error: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  codigo_error: {
    type: DataTypes.STRING(100),
    allowNull: true,

    validate: {
      len: {
        args: [1, 100],
        msg:
          'El código de error no puede superar los 100 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Auditoría de la solicitud
  |--------------------------------------------------------------------------
  */

  ip: {
    type: DataTypes.STRING(45),
    allowNull: true,

    validate: {
      len: {
        args: [1, 45],
        msg:
          'La dirección IP no puede superar los 45 caracteres.',
      },
    },
  },

  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
},
  {
    tableName: 'reportes_exportaciones',

    timestamps: true,
    paranoid: true,
    underscored: true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    deletedAt:
      'deleted_at',

    indexes: [
      {
        name:
          'idx_reportes_exportaciones_usuario',

        fields: [
          'id_usuario',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_tipo',

        fields: [
          'tipo_reporte',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_formato',

        fields: [
          'formato',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_estado',

        fields: [
          'estado',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_created_at',

        fields: [
          'created_at',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_usuario_fecha',

        fields: [
          'id_usuario',
          'created_at',
        ],
      },

      {
        name:
          'idx_reportes_exportaciones_tipo_fecha',

        fields: [
          'tipo_reporte',
          'created_at',
        ],
      },
    ],
  },
);

/*
|--------------------------------------------------------------------------
| Métodos de instancia
|--------------------------------------------------------------------------
*/

/**
 * Marca una exportación como completada.
 */
ReporteExportacion.prototype.marcarCompletado =
  async function marcarCompletado({
    nombre_archivo,
    mime_type,
    total_registros = 0,
    tamano_bytes = null,
    transaction = null,
  } = {}) {
    const fechaFin = new Date();

    const duracionMs = Math.max(
      0,
      fechaFin.getTime()
      - new Date(
        this.fecha_inicio_proceso,
      ).getTime(),
    );

    return this.update(
      {
        estado:
          ESTADOS_EXPORTACION.COMPLETADO,

        nombre_archivo,
        mime_type,
        total_registros,
        tamano_bytes,

        fecha_fin_proceso:
          fechaFin,

        duracion_ms:
          duracionMs,

        mensaje_error:
          null,

        codigo_error:
          null,
      },
      {
        transaction,
      },
    );
  };

/**
 * Marca una exportación como fallida.
 */
ReporteExportacion.prototype.marcarError =
  async function marcarError({
    mensaje_error,
    codigo_error = null,
    transaction = null,
  } = {}) {
    const fechaFin = new Date();

    const duracionMs = Math.max(
      0,
      fechaFin.getTime()
      - new Date(
        this.fecha_inicio_proceso,
      ).getTime(),
    );

    return this.update(
      {
        estado:
          ESTADOS_EXPORTACION.ERROR,

        fecha_fin_proceso:
          fechaFin,

        duracion_ms:
          duracionMs,

        mensaje_error:
          mensaje_error
          || 'No se pudo generar la exportación.',

        codigo_error,
      },
      {
        transaction,
      },
    );
  };

module.exports = ReporteExportacion;