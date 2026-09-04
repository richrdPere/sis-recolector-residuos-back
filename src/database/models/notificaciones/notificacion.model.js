const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const Notificacion = sequelize.define('Notificacion', {
  id_notificacion: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  /*
  |--------------------------------------------------------------------------
  | Usuario creador
  |--------------------------------------------------------------------------
  |
  | Puede ser null cuando la notificación fue generada automáticamente.
  |
  */

  id_usuario_creacion: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id_usuario',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },

  /*
  |--------------------------------------------------------------------------
  | Clasificación
  |--------------------------------------------------------------------------
  |
  | Se utiliza STRING para permitir nuevos tipos sin modificar el ENUM
  | de MySQL cada vez que se amplíe el sistema.
  |
  */

  tipo_notificacion: {
    type:
      DataTypes.STRING(
        60,
      ),

    allowNull:
      false,

    validate: {
      notEmpty: {
        msg:
          'El tipo de notificación es obligatorio.',
      },
    },
  },

  prioridad: {
    type:
      DataTypes.ENUM(
        'BAJA',
        'NORMAL',
        'ALTA',
        'URGENTE',
      ),

    allowNull:
      false,

    defaultValue:
      'NORMAL',
  },

  /*
  |--------------------------------------------------------------------------
  | Contenido
  |--------------------------------------------------------------------------
  */

  titulo: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      false,

    validate: {
      notEmpty: {
        msg:
          'El título de la notificación es obligatorio.',
      },
    },
  },

  mensaje: {
    type:
      DataTypes.TEXT,

    allowNull:
      false,

    validate: {
      notEmpty: {
        msg:
          'El mensaje de la notificación es obligatorio.',
      },
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Canales
  |--------------------------------------------------------------------------
  */

  enviar_interna: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      false,

    defaultValue:
      true,
  },

  enviar_push: {
    type:
      DataTypes.BOOLEAN,

    allowNull:
      false,

    defaultValue:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Entidad relacionada
  |--------------------------------------------------------------------------
  |
  | Ejemplos:
  | PROGRAMACION, RECORRIDO, RECOLECCION, VEHICULO.
  |
  | No se usa una FK polimórfica porque la entidad relacionada puede
  | pertenecer a distintas tablas.
  |
  */

  tipo_entidad: {
    type:
      DataTypes.STRING(
        50,
      ),

    allowNull:
      true,
  },

  id_entidad: {
    type:
      DataTypes.BIGINT,

    allowNull:
      true,
  },

  datos: {
    type:
      DataTypes.JSON,

    allowNull:
      true,

    comment:
      'Datos adicionales utilizados para navegación o procesamiento.',
  },

  /*
  |--------------------------------------------------------------------------
  | Idempotencia del evento
  |--------------------------------------------------------------------------
  |
  | Ejemplos:
  | CAPACIDAD_80:RECORRIDO:12
  | CANCELACION:PROGRAMACION:25
  |
  */

  clave_evento: {
    type:
      DataTypes.STRING(
        150,
      ),

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Programación del envío
  |--------------------------------------------------------------------------
  */

  fecha_programada: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  fecha_expiracion: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | Estado general
  |--------------------------------------------------------------------------
  */

  estado_notificacion: {
    type:
      DataTypes.ENUM(
        'BORRADOR',
        'PENDIENTE',
        'PROCESANDO',
        'ENVIADA',
        'PARCIAL',
        'FALLIDA',
        'CANCELADA',
      ),

    allowNull:
      false,

    defaultValue:
      'PENDIENTE',
  },

  origen: {
    type:
      DataTypes.ENUM(
        'WEB',
        'MOVIL',
        'SISTEMA',
        'API',
      ),

    allowNull:
      false,

    defaultValue:
      'SISTEMA',
  },

  fecha_procesamiento: {
    type:
      DataTypes.DATE,

    allowNull:
      true,
  },
},
  {
    tableName: 'notificaciones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    /*
    | Las notificaciones no se eliminan físicamente.
    | Para retirarlas se utiliza CANCELADA.
    */

    indexes: [
      {
        unique: true,
        fields: [
          'clave_evento',
        ],
        name: 'uk_notificacion_clave_evento',
      },
      {
        fields: [
          'tipo_notificacion',
        ],
        name: 'idx_notificacion_tipo',
      },
      {
        fields: [
          'estado_notificacion',
        ],
        name: 'idx_notificacion_estado',
      },
      {
        fields: [
          'prioridad',
        ],
        name: 'idx_notificacion_prioridad',
      },
      {
        fields: [
          'tipo_entidad',
          'id_entidad',
        ],
        name: 'idx_notificacion_entidad',
      },
      {
        fields: [
          'fecha_programada',
          'estado_notificacion',
        ],
        name: 'idx_notificacion_programada',
      },
      {
        fields: [
          'created_at',
        ],
        name: 'idx_notificacion_fecha',
      },
    ],

    validate: {
      atLeastOneChannel() {
        if (
          !this.enviar_interna &&
          !this.enviar_push
        ) {
          throw new Error(
            'La notificación debe utilizar al menos un canal.',
          );
        }
      },

      validRelatedEntity() {
        const hasEntityType =
          this.tipo_entidad !==
          null &&
          this.tipo_entidad !==
          undefined;

        const hasEntityId =
          this.id_entidad !==
          null &&
          this.id_entidad !==
          undefined;

        if (
          hasEntityType !==
          hasEntityId
        ) {
          throw new Error(
            'El tipo y el identificador de la entidad deben registrarse juntos.',
          );
        }
      },

      validExpirationDate() {
        if (
          this.fecha_programada &&
          this.fecha_expiracion &&
          new Date(
            this.fecha_expiracion,
          ) <=
          new Date(
            this.fecha_programada,
          )
        ) {
          throw new Error(
            'La fecha de expiración debe ser posterior a la fecha programada.',
          );
        }
      },
    },
  },
);

module.exports = Notificacion;