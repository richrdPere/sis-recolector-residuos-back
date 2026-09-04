// recoleccion.associations.js

module.exports = (db) => {
  const {
    Recorrido,
    RecoleccionPunto,
    RutaPunto,
    RecoleccionEvidencia,
    Usuario
  } = db;


  // ==========================================================
  // Recorrido - Recoleccion Punto
  // ==========================================================
  Recorrido.hasMany(RecoleccionPunto, {
    foreignKey: 'id_recorrido',
    sourceKey: 'id_recorrido',
    as: 'recolecciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  RecoleccionPunto.belongsTo(Recorrido, {
    foreignKey: 'id_recorrido',
    targetKey: 'id_recorrido',
    as: 'recorrido',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Ruta Punto - Recoleccion Punto
  // ==========================================================
  RutaPunto.hasMany(RecoleccionPunto, {
    foreignKey: 'id_ruta_punto',
    sourceKey: 'id_ruta_punto',
    as: 'recolecciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  RecoleccionPunto.belongsTo(RutaPunto, {
    foreignKey: 'id_ruta_punto',
    targetKey: 'id_ruta_punto',
    as: 'punto_ruta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Recoleccion Punto - Recoleccion evidencia
  // ==========================================================
  RecoleccionPunto.hasMany(RecoleccionEvidencia, {
    foreignKey: 'id_recoleccion',
    sourceKey: 'id_recoleccion',
    as: 'evidencias',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  RecoleccionEvidencia.belongsTo(RecoleccionPunto, {
    foreignKey: 'id_recoleccion',
    targetKey: 'id_recoleccion',
    as: 'recoleccion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Recoleccion Punto - Usuario
  // ==========================================================
  RecoleccionPunto.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario_registro',
  });

  RecoleccionPunto.belongsTo(Usuario, {
    foreignKey: 'id_usuario_anulacion',
    as: 'usuario_anulacion',
  });

  // ==========================================================
  // Usuario - Recoleccion Punto
  // ==========================================================
  Usuario.hasMany(RecoleccionPunto, {
    foreignKey: 'id_usuario',
    as: 'recolecciones_registradas',
  });

  Usuario.hasMany(RecoleccionPunto, {
    foreignKey: 'id_usuario_anulacion',
    as: 'recolecciones_anuladas',
  });

  // ==========================================================
  // Recoleccion evidencia - Usuario
  // ==========================================================
  RecoleccionEvidencia.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario_registro',
  });

  RecoleccionEvidencia.belongsTo(Usuario, {
    foreignKey: 'id_usuario_anulacion',
    as: 'usuario_anulacion',
  });
}
