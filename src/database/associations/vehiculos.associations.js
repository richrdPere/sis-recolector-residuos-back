// vehiculos.associations.js

module.exports = (db) => {

  // ==========================================================
  // TODO: Vehiculo - Mantenimiento Vehiculo
  // ==========================================================
  // db.Vehiculo.hasMany(db.MantenimientoVehiculo, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'mantenimientos',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });

  // db.MantenimientoVehiculo.belongsTo(db.Vehiculo, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'vehiculo',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });

  // ==========================================================
  // TODO: Vehiculo - Programacion Ruta
  // ==========================================================
  // db.Vehiculo.hasMany(db.ProgramacionRuta, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'programaciones',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });

  // db.ProgramacionRuta.belongsTo(db.Vehiculo, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'vehiculo',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });


  // ==========================================================
  // TODO:Vehiculo - Ubicacion Vehiculo
  // ==========================================================
  // db.Vehiculo.hasMany(db.UbicacionVehiculo, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'ubicaciones',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });

  // db.UbicacionVehiculo.belongsTo(db.Vehiculo, {
  //   foreignKey: 'id_vehiculo',
  //   as: 'vehiculo',
  //   onUpdate: 'CASCADE',
  //   onDelete: 'RESTRICT',
  // });

};