// recorridos.associations.js

module.exports = (db) => {
  const {
    ProgramacionRuta,
    Recorrido,
    RecorridoEvento,
    Usuario,
  } = db;

  // ==========================================================
  // Programación - Recorrido
  // ==========================================================
  ProgramacionRuta.hasOne(Recorrido, {
    foreignKey: 'id_programacion',
    sourceKey: 'id_programacion',
    as: 'recorrido',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Recorrido.belongsTo(ProgramacionRuta, {
    foreignKey: 'id_programacion',
    targetKey: 'id_programacion',
    as: 'programacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Recorrido - Eventos
  // ==========================================================
  Recorrido.hasMany(RecorridoEvento, {
    foreignKey: 'id_recorrido',
    sourceKey: 'id_recorrido',
    as: 'eventos',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  RecorridoEvento.belongsTo(Recorrido, {
    foreignKey: 'id_recorrido',
    targetKey: 'id_recorrido',
    as: 'recorrido',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario que inició el recorrido
  // ==========================================================
  Usuario.hasMany(Recorrido, {
    foreignKey: 'id_usuario_inicio',
    sourceKey: 'id_usuario',
    as: 'recorridos_iniciados',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Recorrido.belongsTo(Usuario, {
    foreignKey: 'id_usuario_inicio',
    targetKey: 'id_usuario',
    as: 'usuario_inicio',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario que finalizó el recorrido
  // ==========================================================
  Usuario.hasMany(Recorrido, {
    foreignKey: 'id_usuario_finalizacion',
    sourceKey: 'id_usuario',
    as: 'recorridos_finalizados',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  Recorrido.belongsTo(Usuario, {
    foreignKey: 'id_usuario_finalizacion',
    targetKey: 'id_usuario',
    as: 'usuario_finalizacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario responsable del evento
  // ==========================================================
  Usuario.hasMany(RecorridoEvento, {
    foreignKey: 'id_usuario',
    sourceKey: 'id_usuario',
    as: 'eventos_recorrido',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  RecorridoEvento.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    targetKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
};