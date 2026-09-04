// recorridos.associations.js

module.exports = (db) => {
  const {
    ProgramacionRuta,
    Recorrido,
    RecorridoEvento,
    Usuario,
    RecorridoPosicion,
    RecorridoUltimaUbicacion,
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

  // ==========================================================
  // Recorrido - recorrido posicion
  // ==========================================================
  Recorrido.hasMany(RecorridoPosicion, {
    foreignKey: 'id_recorrido',
    as: 'posiciones',
  });

  RecorridoPosicion.belongsTo(Recorrido, {
    foreignKey: 'id_recorrido',
    as: 'recorrido',
  });

  // ==========================================================
  // Recorrido - recorrido ultima ubicacion
  // ==========================================================
  Recorrido.hasOne(RecorridoUltimaUbicacion, {
    foreignKey: 'id_recorrido',
    as: 'ultima_ubicacion',
  });

  RecorridoUltimaUbicacion.belongsTo(Recorrido, {
    foreignKey: 'id_recorrido',
    as: 'recorrido',
  });

  // ==========================================================
  // Recorrido posicion - recorrido ultima ubicacion
  // ==========================================================
  RecorridoPosicion.hasOne(RecorridoUltimaUbicacion, {
    foreignKey: 'id_posicion',
    as: 'referencia_ultima_ubicacion',
  });

  RecorridoUltimaUbicacion.belongsTo(RecorridoPosicion, {
    foreignKey: 'id_posicion',
    as: 'posicion',
  });

  // ==========================================================
  // Usuario - recorrido posicion
  // ==========================================================
  Usuario.hasMany(RecorridoPosicion, {
    foreignKey: 'id_usuario',
    as: 'posiciones_transmitidas',
  });

  RecorridoPosicion.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario',
  });

  // ==========================================================
  // Usuario - recorrido ultima ubicacion
  // ==========================================================
  Usuario.hasMany(RecorridoUltimaUbicacion, {
    foreignKey: 'id_usuario',
    as: 'ultimas_ubicaciones_transmitidas',
  });

  RecorridoUltimaUbicacion.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario',
  });
};