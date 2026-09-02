const sequelize = require("../../config/database");

const db = {};

// CONEXIÓN
db.sequelize = sequelize;

// MODELOS

// - Auth
db.Usuario = require("./auth/usuario.model");
db.Roles = require("./auth/roles.model");
db.UsuarioRol = require("./auth/usuario_rol.model");
db.Persona = require("./auth/persona.model");
db.RefreshToken = require('./auth/refresh_token.model');

// - Vehículos
db.Vehiculo = require("./vehiculo/vehiculo.model");

// - Personal operativo
db.PersonalOperativo = require('./personal/personal_operativo.model');
db.ConductorPerfil = require('./personal/conductor_perfil.model');

// - Zonas y rutas
db.Zona = require('./rutas/zona.model');
db.Ruta = require('./rutas/ruta.model');
db.RutaVersion = require('./rutas/ruta_version.model');
db.RutaPunto = require('./rutas/ruta_punto.model');
db.RutaHorario = require('./rutas/ruta_horario.model');

// CARGAR ASOCIACIONES
require("../associations")(db);


// EXPORT
module.exports = db;



