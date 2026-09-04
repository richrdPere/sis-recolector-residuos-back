// notificaciones.associations.js

module.exports = (db) => {
  const {
    Usuario,
    Notificacion,
    NotificacionUsuario,
    UsuarioDispositivo,
    NotificacionEnvio,
  } = db;

  // ==========================================================
  // Usuario creador - Notificación
  // ==========================================================
  Usuario.hasMany(Notificacion, {
    foreignKey: 'id_usuario_creacion',
    sourceKey: 'id_usuario',
    as: 'notificaciones_creadas',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  Notificacion.belongsTo(Usuario, {
    foreignKey: 'id_usuario_creacion',
    targetKey: 'id_usuario',
    as: 'creador',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // ==========================================================
  // Notificación - Destinatarios
  // ==========================================================
  Notificacion.hasMany(NotificacionUsuario, {
    foreignKey: 'id_notificacion',
    sourceKey: 'id_notificacion',
    as: 'destinatarios',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  NotificacionUsuario.belongsTo(Notificacion, {
    foreignKey: 'id_notificacion',
    targetKey: 'id_notificacion',
    as: 'notificacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario destinatario - Notificación Usuario
  // ==========================================================
  Usuario.hasMany(NotificacionUsuario, {
    foreignKey: 'id_usuario',
    sourceKey: 'id_usuario',
    as: 'notificaciones_recibidas',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  NotificacionUsuario.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    targetKey: 'id_usuario',
    as: 'destinatario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario - Dispositivos
  // ==========================================================
  Usuario.hasMany(UsuarioDispositivo, {
    foreignKey: 'id_usuario',
    sourceKey: 'id_usuario',
    as: 'dispositivos',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  UsuarioDispositivo.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    targetKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Notificación Usuario - Intentos de envío
  // ==========================================================
  NotificacionUsuario.hasMany(NotificacionEnvio, {
    foreignKey: 'id_notificacion_usuario',
    sourceKey: 'id_notificacion_usuario',
    as: 'envios',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  NotificacionEnvio.belongsTo(NotificacionUsuario, {
    foreignKey: 'id_notificacion_usuario',
    targetKey: 'id_notificacion_usuario',
    as: 'notificacion_usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Dispositivo - Intentos de envío
  // ==========================================================
  UsuarioDispositivo.hasMany(NotificacionEnvio, {
    foreignKey: 'id_dispositivo',
    sourceKey: 'id_dispositivo',
    as: 'envios_notificacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  NotificacionEnvio.belongsTo(UsuarioDispositivo, {
    foreignKey: 'id_dispositivo',
    targetKey: 'id_dispositivo',
    as: 'dispositivo',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
};