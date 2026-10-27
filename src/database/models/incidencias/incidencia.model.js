const { DataTypes, } = require('sequelize');
const sequelize = require('../../../config/database');

// ==========================================================
// MODELO: INCIDENCIA
// ==========================================================

const Incidencia = sequelize.define("Incidencia", {
  id_incidencia: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  // Usuario autenticado que registra la incidencia.
  id_usuario_reporte: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },

  // Usuario encargado de gestionar o resolver la incidencia.
  id_responsable: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  // Opcional: incidencias durante un recorrido.
  id_recorrido: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  // Contexto territorial opcional.
  id_zona: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  id_ruta: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },

  tipo: {
    type: DataTypes.ENUM(
      "VIA_BLOQUEADA",
      "AVERIA_VEHICULO",
      "ACCIDENTE",
      "RECOLECCION_NO_REALIZADA",
      "ACUMULACION_RESIDUOS",
      "PUNTO_INACCESIBLE",
      "OTRO",
    ),
    allowNull: false,
  },

  prioridad: {
    type: DataTypes.ENUM(
      "BAJA",
      "MEDIA",
      "ALTA",
      "CRITICA",
    ),
    allowNull: false,
    defaultValue: "MEDIA",
  },

  titulo: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 150],
    },
  },

  descripcion: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },

  origen: {
    type: DataTypes.ENUM(
      "APP_OPERATIVA",
      "APP_CIUDADANA",
      "WEB_MUNICIPAL",
      "WEB_CIUDADANA",
    ),
    allowNull: false,
  },

  estado_incidencia: {
    type: DataTypes.ENUM(
      "REPORTADA",
      "EN_REVISION",
      "EN_ATENCION",
      "RESUELTA",
      "RECHAZADA",
      "CANCELADA",
    ),
    allowNull: false,
    defaultValue: "REPORTADA",
  },

  fecha_reporte: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },

  fecha_resolucion: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  detalle_resolucion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  latitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    validate: {
      min: -90,
      max: 90,
    },
  },

  longitud: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
    validate: {
      min: -180,
      max: 180,
    },
  },

  precision_ubicacion: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: "Precisión horizontal reportada, en metros",
    validate: {
      min: 0,
    },
  },

  direccion_referencia: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  // Habilitación administrativa.
  // No representa el estado de atención.
  estado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
},
  {
    tableName: "incidencias",

    timestamps: true,
    paranoid: true,

    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",

    indexes: [
      {
        fields: ["estado_incidencia", "fecha_reporte"],
      },
      {
        fields: ["id_usuario_reporte"],
      },
      {
        fields: ["id_responsable", "estado_incidencia"],
      },
      {
        fields: ["id_recorrido"],
      },
      {
        fields: ["id_zona", "fecha_reporte"],
      },
      {
        fields: ["id_ruta"],
      },
    ],

    validate: {
      coordenadasCompletas() {
        const tieneLatitud = this.latitud != null;
        const tieneLongitud = this.longitud != null;

        if (tieneLatitud !== tieneLongitud) {
          throw new Error(
            "Debe proporcionar latitud y longitud conjuntamente.",
          );
        }

        if (
          this.precision_ubicacion != null &&
          !tieneLatitud
        ) {
          throw new Error(
            "La precisión requiere una ubicación registrada.",
          );
        }
      },

      fechasCoherentes() {
        if (
          this.fecha_reporte &&
          this.fecha_resolucion &&
          new Date(this.fecha_resolucion).getTime() <
          new Date(this.fecha_reporte).getTime()
        ) {
          throw new Error(
            "La fecha de resolución no puede ser anterior al reporte.",
          );
        }
      },
    },
  },
);

module.exports = Incidencia;