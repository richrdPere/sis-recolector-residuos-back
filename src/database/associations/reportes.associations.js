// reportes.associations.js

module.exports = (db) => {
  const {
    ReporteExportacion,
    Usuario
  } = db;


  // ==========================================================
  // Usuario - Reporte exportacion
  // ==========================================================
  Usuario.hasMany(ReporteExportacion, {
    foreignKey: 'id_usuario',
    as: 'reportes_exportados',
  },
  );

  ReporteExportacion.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuarios',
  },
  );
}