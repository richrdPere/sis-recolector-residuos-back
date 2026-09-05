module.exports = (db) => {

    // - Auth
    require("./auth.associations")(db);

    // - Vehículos
    require("./vehiculos.associations")(db);

    // - Personal operativo
    require("./personal.associations")(db);

    // - Rutas y zonas
    require("./rutas.associations")(db);

    // - Programaciones
    require("./programaciones.associations")(db);

    // - Recorridos
    require('./recorridos.associations')(db);

    // - Recoleccion
    require("./recoleccion.associations")(db);

    // - Incidentes


    // - Notificaciones
    require("./notificaciones.associations")(db);

    // - Ciudadanos
    require("./ciudadanos.associations")(db);

}