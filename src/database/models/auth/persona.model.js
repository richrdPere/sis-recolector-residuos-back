const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const Persona = sequelize.define(
  "Persona",
  {
    id_persona: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    nombres: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    apellidos: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },

    email_contacto: {
      type: DataTypes.STRING(150),
      validate: {
        isEmail: true,
      },
    },

    tipo_documento: {
      type: DataTypes.ENUM(
        "DNI",
        "RUC",
        "CE",
        "PASAPORTE",
      ),
      allowNull: false,
      defaultValue: "DNI",
    },

    numero_documento: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
    },

    celular: {
      type: DataTypes.STRING(20),
    },

    direccion: {
      type: DataTypes.STRING(255),
    },

    foto_url: {
      type: DataTypes.STRING,
    },

    genero: {
      type: DataTypes.ENUM(
        "M",
        "F",
        "OTRO",
      ),
    },

    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "personas",

    timestamps: true,

    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
);

module.exports = Persona;