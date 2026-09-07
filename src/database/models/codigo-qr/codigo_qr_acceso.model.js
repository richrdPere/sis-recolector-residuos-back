const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const CodigoQrAcceso = sequelize.define('CodigoQrAcceso', {
  id_acceso_qr: {
    type:
      DataTypes.BIGINT,

    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Código QR consultado
  |--------------------------------------------------------------------------
  |
  | Puede ser null para registrar intentos con tokens inexistentes.
  |
  */
  id_codigo_qr: {
    type: DataTypes.BIGINT,
    allowNull: true,

    references: {
      model: 'codigos_qr',
      key: 'id_codigo_qr',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },

  /*
  |--------------------------------------------------------------------------
  | Token consultado anonimizado
  |--------------------------------------------------------------------------
  |
  | Nunca guardamos directamente un token inexistente o inválido. Se
  | almacena su hash SHA-256 para análisis y control de abuso.
  |
  */

  token_consultado_hash: {
    type:
      DataTypes.STRING(64),

    allowNull: true,

    validate: {
      is: {
        args: [
          /^[a-f0-9]{64}$/i,
        ],

        msg:
          'El hash del token consultado no es válido.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Resultado de la consulta
  |--------------------------------------------------------------------------
  */

  resultado: {
    type:
      DataTypes.ENUM(
        'RESUELTO',
        'INACTIVO',
        'REVOCADO',
        'EXPIRADO',
        'NO_ENCONTRADO',
        'ERROR',
      ),

    allowNull: false,
  },

  fecha_acceso: {
    type:
      DataTypes.DATE,

    allowNull: false,
    defaultValue:
      DataTypes.NOW,
  },

  /*
  |--------------------------------------------------------------------------
  | Información anonimizada del cliente
  |--------------------------------------------------------------------------
  */

  ip_hash: {
    type:
      DataTypes.STRING(64),

    allowNull: true,

    validate: {
      is: {
        args: [
          /^[a-f0-9]{64}$/i,
        ],

        msg:
          'El hash de la dirección IP no es válido.',
      },
    },

    comment:
      'Hash SHA-256 de la IP combinado con un secreto del servidor.',
  },

  user_agent: {
    type:
      DataTypes.STRING(500),

    allowNull: true,
  },

  referer: {
    type:
      DataTypes.STRING(500),

    allowNull: true,
  },

  plataforma: {
    type:
      DataTypes.ENUM(
        'MOVIL',
        'TABLET',
        'ESCRITORIO',
        'DESCONOCIDA',
      ),

    allowNull: false,
    defaultValue:
      'DESCONOCIDA',
  },

  idioma: {
    type:
      DataTypes.STRING(20),

    allowNull: true,

    comment:
      'Idioma reportado por el navegador, por ejemplo es-PE.',
  },

  /*
  |--------------------------------------------------------------------------
  | Métricas técnicas
  |--------------------------------------------------------------------------
  */

  duracion_ms: {
    type:
      DataTypes.INTEGER
        .UNSIGNED,

    allowNull: true,

    comment:
      'Tiempo utilizado por el backend para resolver la consulta.',
  },

  datos: {
    type:
      DataTypes.JSON,

    allowNull: true,

    comment:
      'Información técnica no sensible asociada con la consulta.',
  },
},
  {
    tableName:
      'codigo_qr_accesos',

    /*
    |--------------------------------------------------------------------------
    | Historial inmutable
    |--------------------------------------------------------------------------
    |
    | Los accesos solamente registran created_at. No se actualizan ni
    | eliminan ordinariamente.
    |
    */

    timestamps: true,

    createdAt:
      'created_at',

    updatedAt:
      false,

    indexes: [
      {
        fields: [
          'id_codigo_qr',
        ],

        name:
          'idx_acceso_qr_codigo',
      },
      {
        fields: [
          'fecha_acceso',
        ],

        name:
          'idx_acceso_qr_fecha',
      },
      {
        fields: [
          'resultado',
        ],

        name:
          'idx_acceso_qr_resultado',
      },
      {
        fields: [
          'plataforma',
        ],

        name:
          'idx_acceso_qr_plataforma',
      },
      {
        fields: [
          'ip_hash',
        ],

        name:
          'idx_acceso_qr_ip_hash',
      },
      {
        fields: [
          'token_consultado_hash',
        ],

        name:
          'idx_acceso_qr_token_hash',
      },
      {
        fields: [
          'id_codigo_qr',
          'fecha_acceso',
        ],

        name:
          'idx_acceso_qr_codigo_fecha',
      },
      {
        fields: [
          'resultado',
          'fecha_acceso',
        ],

        name:
          'idx_acceso_qr_resultado_fecha',
      },
    ],

    validate: {
      /*
      |--------------------------------------------------------------------------
      | Consistencia del resultado
      |--------------------------------------------------------------------------
      */

      resultadoConsistente() {
        const resultWithoutQr = [
          'NO_ENCONTRADO',
          'ERROR',
        ];

        if (
          this.id_codigo_qr &&
          this.resultado ===
          'NO_ENCONTRADO'
        ) {
          throw new Error(
            'Un acceso no encontrado no puede tener un código QR asociado.',
          );
        }

        if (
          !this.id_codigo_qr &&
          !resultWithoutQr.includes(
            this.resultado,
          )
        ) {
          throw new Error(
            'El resultado indicado requiere un código QR asociado.',
          );
        }
      },
    },
  },
);

module.exports = CodigoQrAcceso;