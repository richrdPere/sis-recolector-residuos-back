const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const Usuario = sequelize.define("Usuario", {
  id_usuario: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },

  id_persona: {
    type: DataTypes.BIGINT,
    allowNull: false,
    unique: true,
    references: {
      model: 'personas',
      key: 'id_persona',
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },

  email_acceso: {
    type: DataTypes.STRING(150),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  },

  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },

  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },

  ultimo_acceso: {
    type: DataTypes.DATE,
  },

}, {
  tableName: "usuarios",
  timestamps: true,
  paranoid: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
  deletedAt: "deleted_at",
});

module.exports = Usuario;