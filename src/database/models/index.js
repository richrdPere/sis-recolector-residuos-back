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

// - Programaciones y asignaciones
db.ProgramacionRuta = require('./programaciones/programacion_ruta.model');
db.ProgramacionPersonal = require('./programaciones/programacion_personal.model');
db.ProgramacionHistorial = require('./programaciones/programacion_historial.model');

// - Recorridos
db.Recorrido = require('./recorridos/recorrido.model');
db.RecorridoEvento = require('./recorridos/recorrido-evento.model');
db.RecorridoPosicion = require("./recorridos/recorrido-posicion.model");
db.RecorridoUltimaUbicacion = require("./recorridos/recorrido-ultima-ubicacion.model");

// - Recoleccion
db.RecoleccionEvidencia = require("./recoleccion/recoleccion-evidencia.model");
db.RecoleccionPunto = require("./recoleccion/recoleccion-punto.model");

// - Incidentes

// - Notificaciones
db.NotificacionEnvio = require("./notificaciones/notificacion_envio.model");
db.NotificacionUsuario = require("./notificaciones/notificacion_usuario.model");
db.Notificacion = require("./notificaciones/notificacion.model");
db.UsuarioDispositivo = require("./notificaciones/usuario_dispositivo.model");

// - Ciudadanos
db.CiudadanoDomicilio = require("./ciudadanos/ciudadano_domicilio.model");
db.CiudadanoPreferenciaNotificacion = require("./ciudadanos/ciudadano_preferencia_notificacion.model");
db.Ciudadano = require("./ciudadanos/ciudadano.model");

// - Codigo QR
db.CodigoQr = require('./codigo-qr/codigo_qr.model');
db.CodigoQrAcceso = require('./codigo-qr/codigo_qr_acceso.model');

// CARGAR ASOCIACIONES
require("../associations")(db);


// EXPORT
module.exports = db;



