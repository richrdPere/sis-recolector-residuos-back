const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const Roles = sequelize.define("Roles", {

    id_rol: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },

    nombre: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
    },

    descripcion: {
        type: DataTypes.STRING(255),
    },

    estado: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

}, {
    tableName: "roles",
    timestamps: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
});

module.exports = Roles;