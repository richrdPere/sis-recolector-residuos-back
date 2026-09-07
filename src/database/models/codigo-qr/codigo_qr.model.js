const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const CodigoQr = sequelize.define('CodigoQr', {
  id_codigo_qr: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Código administrativo
  |--------------------------------------------------------------------------
  |
  | Identificador legible utilizado en listados e informes.
  | Ejemplo: QR-ZONA-000001
  |
  */

  codigo: {
    type:
      DataTypes.STRING(50),

    allowNull: false,
    unique: true,

    validate: {
      notEmpty: {
        msg:
          'El código administrativo es obligatorio.',
      },

      len: {
        args: [
          5,
          50,
        ],

        msg:
          'El código administrativo debe tener entre 5 y 50 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Token público
  |--------------------------------------------------------------------------
  |
  | Token aleatorio que se incluye en la URL pública. No debe generarse
  | utilizando el identificador secuencial de la zona o ruta.
  |
  */

  token_publico: {
    type:
      DataTypes.STRING(64),

    allowNull: false,
    unique: true,

    validate: {
      notEmpty: {
        msg:
          'El token público es obligatorio.',
      },

      is: {
        args: [
          /^[a-f0-9]{64}$/i,
        ],

        msg:
          'El token público debe ser una cadena hexadecimal de 64 caracteres.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Recurso relacionado
  |--------------------------------------------------------------------------
  */

  tipo_recurso: {
    type:
      DataTypes.ENUM(
        'ZONA',
        'RUTA',
      ),

    allowNull: false,
  },

  id_zona: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

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
      'RESTRICT',
  },

  /*
  |--------------------------------------------------------------------------
  | Información visible
  |--------------------------------------------------------------------------
  */

  titulo: {
    type:
      DataTypes.STRING(150),

    allowNull: false,

    validate: {
      notEmpty: {
        msg:
          'El título del código QR es obligatorio.',
      },

      len: {
        args: [
          3,
          150,
        ],

        msg:
          'El título debe tener entre 3 y 150 caracteres.',
      },
    },
  },

  descripcion: {
    type:
      DataTypes.STRING(500),

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Versión y reemplazo
  |--------------------------------------------------------------------------
  |
  | Cuando un QR es regenerado, se crea uno nuevo y el anterior pasa
  | a estado REVOCADO.
  |
  */

  version: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: false,
    defaultValue: 1,

    validate: {
      min: {
        args: [1],

        msg:
          'La versión del código QR debe ser mayor que cero.',
      },
    },
  },

  id_codigo_reemplazado: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

    references: {
      model:
        'codigos_qr',

      key:
        'id_codigo_qr',
    },

    onUpdate:
      'CASCADE',

    onDelete:
      'SET NULL',

    comment:
      'Código QR anterior que fue reemplazado por este registro.',
  },

  /*
  |--------------------------------------------------------------------------
  | Estado
  |--------------------------------------------------------------------------
  */

  estado_qr: {
    type:
      DataTypes.ENUM(
        'ACTIVO',
        'INACTIVO',
        'REVOCADO',
      ),

    allowNull: false,
    defaultValue:
      'ACTIVO',
  },

  fecha_generacion: {
    type:
      DataTypes.DATE,

    allowNull: false,
    defaultValue:
      DataTypes.NOW,
  },

  fecha_expiracion: {
    type:
      DataTypes.DATE,

    allowNull: true,

    comment:
      'Los códigos QR físicos normalmente no tendrán fecha de expiración.',
  },

  fecha_revocacion: {
    type:
      DataTypes.DATE,

    allowNull: true,
  },

  motivo_revocacion: {
    type:
      DataTypes.STRING(500),

    allowNull: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario creador
  |--------------------------------------------------------------------------
  |
  | Puede ser null cuando el código sea generado automáticamente.
  |
  */

  id_usuario_creacion: {
    type:
      DataTypes.BIGINT,

    allowNull: true,

    references: {
      model:
        'usuarios',

      key:
        'id_usuario',
    },

    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },

  observacion: {
    type:
      DataTypes.TEXT,

    allowNull: true,
  },
},
  {
    tableName: 'codigos_qr',

    timestamps: true,
    paranoid: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        unique: true,
        fields: [
          'codigo',
        ],
        name:
          'uk_codigo_qr_codigo',
      },
      {
        unique: true,
        fields: [
          'token_publico',
        ],
        name:
          'uk_codigo_qr_token',
      },
      {
        fields: [
          'tipo_recurso',
        ],
        name:
          'idx_codigo_qr_tipo',
      },
      {
        fields: [
          'id_zona',
        ],
        name:
          'idx_codigo_qr_zona',
      },
      {
        fields: [
          'id_ruta',
        ],
        name:
          'idx_codigo_qr_ruta',
      },
      {
        fields: [
          'estado_qr',
        ],
        name:
          'idx_codigo_qr_estado',
      },
      {
        fields: [
          'tipo_recurso',
          'estado_qr',
        ],
        name:
          'idx_codigo_qr_tipo_estado',
      },
      {
        fields: [
          'id_zona',
          'estado_qr',
        ],
        name:
          'idx_codigo_qr_zona_estado',
      },
      {
        fields: [
          'id_ruta',
          'estado_qr',
        ],
        name:
          'idx_codigo_qr_ruta_estado',
      },
      {
        fields: [
          'id_usuario_creacion',
        ],

        name:
          'idx_codigo_qr_usuario',
      },
      {
        fields: [
          'id_codigo_reemplazado',
        ],

        name:
          'idx_codigo_qr_reemplazado',
      },
      {
        fields: [
          'fecha_generacion',
        ],

        name:
          'idx_codigo_qr_fecha_generacion',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Validar recurso relacionado
      |--------------------------------------------------------------------------
      */

      recursoValido() {
        if (
          this.tipo_recurso ===
          'ZONA'
        ) {
          if (!this.id_zona) {
            throw new Error(
              'El código QR de zona debe tener una zona asociada.',
            );
          }

          if (this.id_ruta) {
            throw new Error(
              'El código QR de zona no puede tener una ruta asociada.',
            );
          }
        }

        if (
          this.tipo_recurso ===
          'RUTA'
        ) {
          if (!this.id_ruta) {
            throw new Error(
              'El código QR de ruta debe tener una ruta asociada.',
            );
          }

          if (this.id_zona) {
            throw new Error(
              'El código QR de ruta no puede tener una zona asociada.',
            );
          }
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Validar expiración
      |--------------------------------------------------------------------------
      */

      expiracionValida() {
        if (
          this.fecha_expiracion &&
          this.fecha_generacion &&
          new Date(
            this.fecha_expiracion,
          ) <=
          new Date(
            this.fecha_generacion,
          )
        ) {
          throw new Error(
            'La fecha de expiración debe ser posterior a la fecha de generación.',
          );
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Validar revocación
      |--------------------------------------------------------------------------
      */

      revocacionCompleta() {
        if (
          this.estado_qr ===
          'REVOCADO'
        ) {
          if (
            !this.fecha_revocacion
          ) {
            throw new Error(
              'Debe registrarse la fecha de revocación del código QR.',
            );
          }

          if (
            !this
              .motivo_revocacion
          ) {
            throw new Error(
              'Debe registrarse el motivo de revocación del código QR.',
            );
          }
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Evitar autorreferencia
      |--------------------------------------------------------------------------
      */

      reemplazoValido() {
        if (
          this.id_codigo_qr &&
          this
            .id_codigo_reemplazado &&
          Number(
            this.id_codigo_qr,
          ) ===
          Number(
            this
              .id_codigo_reemplazado,
          )
        ) {
          throw new Error(
            'Un código QR no puede reemplazarse a sí mismo.',
          );
        }
      },
    },
  },
);

module.exports =
  CodigoQr;