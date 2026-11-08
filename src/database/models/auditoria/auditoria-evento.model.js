const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

// *********************************************************
// VALIDACIONES COMPARTIDAS
// *********************************************************

const validarObjeto = valor => {
  if (
    valor !== null &&
    valor !== undefined &&
    (
      typeof valor !== 'object' ||
      Array.isArray(valor)
    )
  ) {
    throw new Error(
      'Los cambios de auditoría deben ser un objeto.',
    );
  }
};

const impedirModificacion = () => {
  const error = new Error(
    'Los eventos de auditoría son de solo lectura.',
  );

  error.code = 'AUDITORIA_INMUTABLE';

  throw error;
};

// *********************************************************
// MODELO
// *********************************************************

const AuditoriaEvento = sequelize.define(
  'AuditoriaEvento',
  {
    id_auditoria: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    clave_evento: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,

      validate: {
        isUUID: 4,
      },
    },

    // -----------------------------------------------------
    // ACTOR
    // -----------------------------------------------------

    id_usuario: {
      // Debe coincidir con usuarios.id_usuario.
      type: DataTypes.BIGINT,
      allowNull: true,

      references: {
        model: 'usuarios',
        key: 'id_usuario',
      },

      onUpdate: 'RESTRICT',
      onDelete: 'RESTRICT',
    },

    tipo_actor: {
      type: DataTypes.ENUM(
        'USUARIO',
        'SISTEMA',
        'ANONIMO',
      ),
      allowNull: false,
    },

    roles_actor: {
      type: DataTypes.JSON,
      allowNull: false,

      validate: {
        esListaDeRoles(valor) {
          if (
            !Array.isArray(valor) ||
            valor.some(rol =>
              typeof rol !== 'string' ||
              rol.trim().length === 0 ||
              rol.length > 60
            )
          ) {
            throw new Error(
              'Los roles del actor deben ser una lista de textos válidos.',
            );
          }
        },
      },
    },

    // -----------------------------------------------------
    // ACCIÓN
    // -----------------------------------------------------

    modulo: {
      type: DataTypes.STRING(60),
      allowNull: false,

      validate: {
        notEmpty: true,
        len: [1, 60],
        is: /^[A-Z][A-Z0-9_]*$/,
      },
    },

    accion: {
      type: DataTypes.STRING(80),
      allowNull: false,

      validate: {
        notEmpty: true,
        len: [1, 80],
        is: /^[A-Z][A-Z0-9_]*$/,
      },
    },

    tipo_entidad: {
      type: DataTypes.STRING(80),
      allowNull: true,

      validate: {
        notEmpty: true,
        len: [1, 80],
        is: /^[A-Z][A-Z0-9_]*$/,
      },
    },

    id_entidad: {
      // Permite identificar entidades con BIGINT o UUID.
      type: DataTypes.STRING(128),
      allowNull: true,

      validate: {
        notEmpty: true,
        len: [1, 128],
      },
    },

    resultado: {
      type: DataTypes.ENUM(
        'EXITOSO',
        'RECHAZADO',
        'FALLIDO',
      ),
      allowNull: false,
    },

    // -----------------------------------------------------
    // CAMBIOS Y JUSTIFICACIÓN
    // -----------------------------------------------------

    /*
      Ejemplo:
 
      {
        estado: {
          anterior: 'EN_CURSO',
          posterior: 'FINALIZADO'
        }
      }
 
      El service debe seleccionar y sanitizar los campos.
      No guardar cuerpos HTTP completos.
    */
    cambios: {
      type: DataTypes.JSON,
      allowNull: true,

      validate: {
        esObjeto: validarObjeto,
      },
    },

    motivo: {
      type: DataTypes.STRING(1000),
      allowNull: true,

      validate: {
        len: [1, 1000],
      },
    },

    codigo_resultado: {
      type: DataTypes.STRING(100),
      allowNull: true,

      validate: {
        len: [1, 100],
      },
    },

    // -----------------------------------------------------
    // FECHAS
    // -----------------------------------------------------

    fecha_servidor: {
      type: DataTypes.DATE(3),
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    fecha_dispositivo: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },

    // -----------------------------------------------------
    // CONTEXTO
    // -----------------------------------------------------

    origen: {
      type: DataTypes.ENUM(
        'WEB',
        'MOVIL',
        'API',
        'SISTEMA',
        'DESCONOCIDO',
      ),
      allowNull: false,
      defaultValue: 'DESCONOCIDO',
    },

    request_id: {
      type: DataTypes.STRING(128),
      allowNull: true,

      validate: {
        len: [1, 128],
        is: /^[\x21-\x7E]+$/,
      },
    },

    clave_operacion: {
      type: DataTypes.STRING(128),
      allowNull: true,

      validate: {
        len: [1, 128],
        is: /^[\x21-\x7E]+$/,
      },
    },

    ip: {
      type: DataTypes.STRING(45),
      allowNull: true,

      validate: {
        isIP: true,
        len: [1, 45],
      },
    },

    user_agent: {
      type: DataTypes.STRING(1000),
      allowNull: true,

      validate: {
        len: [1, 1000],
      },
    },
  },
  {
    tableName: 'auditoria_eventos',

    timestamps: false,
    paranoid: false,
    underscored: true,

    // -----------------------------------------------------
    // VALIDACIONES ENTRE CAMPOS
    // -----------------------------------------------------

    validate: {
      validarActor() {
        const esUsuario = this.tipo_actor === 'USUARIO';

        const tieneUsuario =
          this.id_usuario !== null &&
          this.id_usuario !== undefined;

        if (esUsuario !== tieneUsuario) {
          throw new Error(
            'Solo los eventos de tipo USUARIO deben tener id_usuario.',
          );
        }
      },

      validarEntidad() {
        if (
          this.id_entidad !== null &&
          this.id_entidad !== undefined &&
          !this.tipo_entidad
        ) {
          throw new Error(
            'Debe indicar el tipo de entidad para registrar su identificador.',
          );
        }
      },
    },

    // -----------------------------------------------------
    // PROTECCIÓN EN SEQUELIZE
    // -----------------------------------------------------

    hooks: {
      beforeUpdate: impedirModificacion,
      beforeBulkUpdate: impedirModificacion,

      beforeDestroy: impedirModificacion,
      beforeBulkDestroy: impedirModificacion,

      beforeUpsert: impedirModificacion,

      beforeSave(instancia) {
        if (!instancia.isNewRecord) {
          impedirModificacion();
        }
      },
    },

    // -----------------------------------------------------
    // ÍNDICES
    // -----------------------------------------------------

    indexes: [
      {
        name: 'uq_auditoria_clave_evento',
        unique: true,
        fields: ['clave_evento'],
      },
      {
        name: 'idx_auditoria_fecha',
        fields: [
          'fecha_servidor',
          'id_auditoria',
        ],
      },
      {
        name: 'idx_auditoria_usuario_fecha',
        fields: [
          'id_usuario',
          'fecha_servidor',
          'id_auditoria',
        ],
      },
      {
        name: 'idx_auditoria_entidad_fecha',
        fields: [
          'tipo_entidad',
          'id_entidad',
          'fecha_servidor',
          'id_auditoria',
        ],
      },
      {
        name: 'idx_auditoria_modulo_accion_fecha',
        fields: [
          'modulo',
          'accion',
          'fecha_servidor',
        ],
      },
      {
        name: 'idx_auditoria_resultado_fecha',
        fields: [
          'resultado',
          'fecha_servidor',
        ],
      },
      {
        name: 'idx_auditoria_request',
        fields: ['request_id'],
      },
      {
        name: 'idx_auditoria_operacion',
        fields: ['clave_operacion'],
      },
    ],
  },
);

module.exports = AuditoriaEvento;