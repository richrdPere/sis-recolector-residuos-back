const db = require("../../../database/models");

const { Roles } = db;

// *********************************************************
// SERVICE: OBTENER CATÁLOGO DE ROLES ACTIVOS
// *********************************************************
const getRolesService = async () => {
    const roles = await Roles.findAll({
        attributes: [
            "id_rol",
            "nombre",
            "descripcion",
            "estado",
        ],

        where: {
            estado: true,
        },

        // Excluye los eliminados lógicamente.
        paranoid: true,

        order: [
            ["id_rol", "ASC"],
        ],
    });

    return roles.map((rol) => rol.get({ plain: true }));
};

module.exports = getRolesService;