// vehiculos.associations.js

module.exports = (db) => {

  const {
    Vehiculo,
    VehiculoMantenimiento,
    VehiculoMantenimientoHistorial,
    Usuario
  } = db;

  // ==========================================================
  // Vehiculo - Mantenimiento
  // ==========================================================
  Vehiculo.hasMany(VehiculoMantenimiento, {
    foreignKey: 'id_vehiculo',
    as: 'mantenimientos',
  });

  VehiculoMantenimiento.belongsTo(Vehiculo, {
    foreignKey: 'id_vehiculo',
    as: 'vehiculo',
  });
  const responsablesMantenimiento = [
    {
      foreignKey: 'id_usuario_creacion',
      aliasUsuario: 'creador',
      aliasMantenimientos: 'mantenimientos_creados',
    },
    {
      foreignKey: 'id_usuario_inicio',
      aliasUsuario: 'usuario_inicio',
      aliasMantenimientos: 'mantenimientos_iniciados',
    },
    {
      foreignKey: 'id_usuario_finalizacion',
      aliasUsuario: 'usuario_finalizacion',
      aliasMantenimientos: 'mantenimientos_finalizados',
    },
    {
      foreignKey: 'id_usuario_cancelacion',
      aliasUsuario: 'usuario_cancelacion',
      aliasMantenimientos: 'mantenimientos_cancelados',
    },
  ];

  for (const relacion of responsablesMantenimiento) {
    Usuario.hasMany(VehiculoMantenimiento, {
      foreignKey: relacion.foreignKey,
      as: relacion.aliasMantenimientos,
    });

    VehiculoMantenimiento.belongsTo(Usuario, {
      foreignKey: relacion.foreignKey,
      as: relacion.aliasUsuario,
    });
  }

  // ==========================================================
  // MANTENIMIENTO - HISTORIAL
  // ==========================================================
  VehiculoMantenimiento.hasMany(VehiculoMantenimientoHistorial,
    {
      foreignKey: 'id_mantenimiento',
      as: 'historial',
    },
  );

  VehiculoMantenimientoHistorial.belongsTo(VehiculoMantenimiento,
    {
      foreignKey: 'id_mantenimiento',
      as: 'mantenimiento',
    },
  );

  // ==========================================================
  // USUARIO → HISTORIAL
  // ==========================================================

  Usuario.hasMany(VehiculoMantenimientoHistorial, {
    foreignKey: 'id_usuario',
    as: 'eventos_mantenimiento',
  });

  VehiculoMantenimientoHistorial.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'actor',
  });

};