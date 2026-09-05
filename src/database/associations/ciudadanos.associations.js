// ciudadanos.associations.js

module.exports = (db) => {
  const {
    Usuario,
    Ciudadano,
    CiudadanoDomicilio,
    CiudadanoPreferenciaNotificacion,
    Zona,
    Ruta,
  } = db;

  // ==========================================================
  // Usuario - Ciudadano
  // ==========================================================
  //
  // Un usuario solamente puede tener un perfil ciudadano.
  //
  Usuario.hasOne(Ciudadano, {
    foreignKey: 'id_usuario',
    sourceKey: 'id_usuario',
    as: 'perfil_ciudadano',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Ciudadano.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    targetKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Ciudadano - Domicilios
  // ==========================================================
  //
  // Un ciudadano puede registrar múltiples domicilios.
  //
  Ciudadano.hasMany(CiudadanoDomicilio, {
    foreignKey: 'id_ciudadano',
    sourceKey: 'id_ciudadano',
    as: 'domicilios',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  CiudadanoDomicilio.belongsTo(Ciudadano, {
    foreignKey: 'id_ciudadano',
    targetKey: 'id_ciudadano',
    as: 'ciudadano',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Ciudadano - Preferencia de notificación
  // ==========================================================
  //
  // Cada ciudadano mantiene una sola configuración.
  //
  Ciudadano.hasOne(CiudadanoPreferenciaNotificacion, {
    foreignKey: 'id_ciudadano',
    sourceKey: 'id_ciudadano',
    as: 'preferencias_notificacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  CiudadanoPreferenciaNotificacion.belongsTo(Ciudadano, {
    foreignKey: 'id_ciudadano',
    targetKey: 'id_ciudadano',
    as: 'ciudadano',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Zona - Domicilios ciudadanos
  // ==========================================================
  //
  // Una zona puede contener múltiples domicilios.
  //
  Zona.hasMany(CiudadanoDomicilio, {
    foreignKey: 'id_zona',
    sourceKey: 'id_zona',
    as: 'domicilios_ciudadanos',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  CiudadanoDomicilio.belongsTo(Zona, {
    foreignKey: 'id_zona',
    targetKey: 'id_zona',
    as: 'zona',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Ruta - Domicilios ciudadanos
  // ==========================================================
  //
  // La ruta puede ser nula. El domicilio puede estar asociado
  // únicamente con una zona hasta que se determine su ruta.
  //
  Ruta.hasMany(CiudadanoDomicilio, {
    foreignKey: 'id_ruta',
    sourceKey: 'id_ruta',
    as: 'domicilios_ciudadanos',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  CiudadanoDomicilio.belongsTo(Ruta, {
    foreignKey: 'id_ruta',
    targetKey: 'id_ruta',
    as: 'ruta',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // ==========================================================
  // Usuario validador - Domicilios
  // ==========================================================
  //
  // Registra qué usuario administrativo validó la ubicación.
  //
  Usuario.hasMany(CiudadanoDomicilio, {
    foreignKey: 'id_usuario_validacion',
    sourceKey: 'id_usuario',
    as: 'domicilios_ciudadanos_validados',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  CiudadanoDomicilio.belongsTo(Usuario, {
    foreignKey: 'id_usuario_validacion',
    targetKey: 'id_usuario',
    as: 'usuario_validacion',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
};