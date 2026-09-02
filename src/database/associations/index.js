module.exports = (db) => {

    // - Auth
    require("./auth.associations")(db);

    // - Vehículos
    require("./vehiculos.associations")(db);

    // - Personal operativo
    require("./personal.associations")(db);

    // // - Movimientos    
    // require("./movimientos.associations")(db);

    // // - Plan mensual
    // require("./plan-mensual.associations")(db);


}