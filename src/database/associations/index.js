module.exports = (db) => {

    // - Auth
    require("./auth.associations")(db);

    // - Vehículos
    require("./vehiculos.associations")(db);

    // - Personal operativo
    require("./personal.associations")(db);

    // - Rutas y zonas
    require("./rutas.associations")(db);

    // // - Plan mensual
    // require("./plan-mensual.associations")(db);


}