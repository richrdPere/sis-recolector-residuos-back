const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const RecoleccionEvidencia = sequelize.define('RecoleccionEvidencia', {
  id_evidencia: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Recolección
  |--------------------------------------------------------------------------
  */

  id_recoleccion: {
    type:
      DataTypes.BIGINT,

    allowNull:
      false,

    references: {
      model:
        'recoleccion_puntos',

      key:
        'id_recoleccion',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario que adjuntó la evidencia
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
  | Tipo de evidencia
  |--------------------------------------------------------------------------
  |
  | Para el MVP se priorizan imágenes. DOCUMENTO y OTRO se mantienen
  | para futuras necesidades administrativas.
  |
  */

  tipo_evidencia: {
    type:
      DataTypes.ENUM(
        'IMAGEN',
        'DOCUMENTO',
        'OTRO',
      ),

    allowNull:
      false,

    defaultValue:
      'IMAGEN',
  },

  /*
  |--------------------------------------------------------------------------
  | Información del archivo
  |--------------------------------------------------------------------------
  */

  nombre_original: {
    type:
      DataTypes.STRING(
        255,
      ),

    allowNull:
      false,
  },

  nombre_almacenado: {
    type:
      DataTypes.STRING(
        255,
      ),

    allowNull:
      false,
  },

  ruta_archivo: {
    type:
      DataTypes.STRING(
        1000,
      ),

    allowNull:
      false,

    comment:
      'Ruta relativa o clave del archivo en el almacenamiento.',
  },

  url_archivo: {
    type:
      DataTypes.STRING(
        1000,
      ),

    allowNull:
      true,

    comment:
      'URL pública o firmada, si corresponde.',
  },

  mime_type: {
    type:
      DataTypes.STRING(
        100,
      ),

    allowNull:
      false,
  },

  extension: {
    type:
      DataTypes.STRING(
        20,
      ),

    allowNull:
      true,
  },

  tamano_bytes: {
    type:
      DataTypes.BIGINT
        .UNSIGNED,

    allowNull:
      false,

    validate: {
      min: {
        args: [1],

        msg:
          'El tamaño del archivo debe ser mayor que cero.',
      },
    },
  },

  hash_sha256: {
    type:
      DataTypes.STRING(
        64,
      ),

    allowNull:
      true,

    comment:
      'Hash opcional para verificar integridad y detectar duplicados.',
  },

  /*
  |--------------------------------------------------------------------------
  | Fecha de captura
  |--------------------------------------------------------------------------
  */

  fecha_captura: {
    type:
      DataTypes.DATE,

    allowNull:
      true,

    comment:
      'Fecha reportada por el dispositivo al tomar la fotografía.',
  },

  /*
  |--------------------------------------------------------------------------
  | Observación
  |--------------------------------------------------------------------------
  */

  descripcion: {
    type:
      DataTypes.STRING(
        500,
      ),

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Estado lógico
  |--------------------------------------------------------------------------
  */

  estado_evidencia: {
    type:
      DataTypes.ENUM(
        'ACTIVA',
        'ANULADA',
      ),

    allowNull:
      false,

    defaultValue:
      'ACTIVA',
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
      'recoleccion_evidencias',

    timestamps:
      true,

    createdAt:
      'created_at',

    updatedAt:
      'updated_at',

    indexes: [
      {
        fields: [
          'id_recoleccion',
          'estado_evidencia',
        ],

        name:
          'idx_evidencia_recoleccion_estado',
      },
      {
        fields: [
          'id_usuario',
        ],

        name:
          'idx_evidencia_usuario',
      },
      {
        fields: [
          'hash_sha256',
        ],

        name:
          'idx_evidencia_hash',
      },
      {
        fields: [
          'created_at',
        ],

        name:
          'idx_evidencia_fecha',
      },
    ],

    validate: {
      anulacionCompleta() {
        if (
          this
            .estado_evidencia ===
          'ANULADA'
        ) {
          if (
            !this
              .motivo_anulacion
              ?.trim()
          ) {
            throw new Error(
              'Debe indicar el motivo de anulación de la evidencia.',
            );
          }

          if (
            !this
              .fecha_anulacion
          ) {
            throw new Error(
              'Debe registrar la fecha de anulación de la evidencia.',
            );
          }

          if (
            !this
              .id_usuario_anulacion
          ) {
            throw new Error(
              'Debe registrar al usuario que anuló la evidencia.',
            );
          }
        }
      },
    },
  },
);

module.exports = RecoleccionEvidencia;