const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/database");

const UsuarioRol = sequelize.define("UsuarioRol", {

    id_usuario_rol: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
    },

    id_usuario: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },

    id_rol: {
        type: DataTypes.BIGINT,
        allowNull: false,
    },

    estado: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },

}, {
    tableName: 'usuario_roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,

    indexes: [
        {
            unique: true,
            fields: [
                'id_usuario',
                'id_rol',
            ],
            name: 'uq_usuario_rol',
        },
    ],
});

module.exports = UsuarioRol;