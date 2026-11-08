module.exports = db => {
  const {
    Usuario,
    AuditoriaEvento,
  } = db;

  // ==========================================================
  // Auditoria evento - Usuario
  // ==========================================================
  Usuario.hasMany(AuditoriaEvento, {
    foreignKey: 'id_usuario',
    as: 'eventos_auditoria',
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT',
  });

  AuditoriaEvento.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'actor',
    onUpdate: 'RESTRICT',
    onDelete: 'RESTRICT',
  });
};