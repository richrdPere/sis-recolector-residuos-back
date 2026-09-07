// codigos-qr.associations.js

module.exports = (db) => {
  const {
    CodigoQr,
    CodigoQrAcceso,
    Zona,
    Ruta,
    Usuario,
  } = db;

  // ==========================================================
  // Zona - Códigos QR
  // ==========================================================
  //
  // Una zona puede tener varios códigos QR históricos, pero
  // solamente uno debería permanecer activo. Esa regla será
  // aplicada desde el service.
  //

  Zona.hasMany(CodigoQr, {
    foreignKey: 'id_zona',
    sourceKey: 'id_zona',
    as: 'codigos_qr',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  CodigoQr.belongsTo(Zona, {
    foreignKey: 'id_zona',
    targetKey: 'id_zona',
    as: 'zona',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Ruta - Códigos QR
  // ==========================================================
  //
  // Una ruta puede tener múltiples versiones históricas de QR.
  //

  Ruta.hasMany(CodigoQr, {
    foreignKey: 'id_ruta',
    sourceKey: 'id_ruta',
    as: 'codigos_qr',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  CodigoQr.belongsTo(Ruta, {
    foreignKey: 'id_ruta',
    targetKey: 'id_ruta',
    as: 'ruta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario creador - Códigos QR
  // ==========================================================
  Usuario.hasMany(CodigoQr, {
    foreignKey: 'id_usuario_creacion',
    sourceKey: 'id_usuario',
    as: 'codigos_qr_creados',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  CodigoQr.belongsTo(Usuario, {
    foreignKey: 'id_usuario_creacion',
    targetKey: 'id_usuario',
    as: 'usuario_creacion',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // ==========================================================
  // Código QR - Accesos
  // ==========================================================
  //
  // Un código puede registrar múltiples consultas públicas.
  //
  CodigoQr.hasMany(CodigoQrAcceso, {
    foreignKey: 'id_codigo_qr',
    sourceKey: 'id_codigo_qr',
    as: 'accesos',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  CodigoQrAcceso.belongsTo(CodigoQr, {
    foreignKey: 'id_codigo_qr',
    targetKey: 'id_codigo_qr',
    as: 'codigo_qr',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // ==========================================================
  // Código QR - Código reemplazado
  // ==========================================================
  //
  // El código nuevo contiene id_codigo_reemplazado apuntando
  // al código anterior.
  //
  // Ejemplo:
  //
  // QR versión 2
  // id_codigo_reemplazado = ID de QR versión 1
  //

  CodigoQr.belongsTo(CodigoQr, {
    foreignKey: 'id_codigo_reemplazado',
    targetKey: 'id_codigo_qr',
    as: 'codigo_reemplazado',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  /*
   * Desde el código anterior permite obtener el código
   * que lo reemplazó.
   */

  CodigoQr.hasOne(CodigoQr, {
    foreignKey: 'id_codigo_reemplazado',
    sourceKey: 'id_codigo_qr',
    as: 'codigo_reemplazo',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
};