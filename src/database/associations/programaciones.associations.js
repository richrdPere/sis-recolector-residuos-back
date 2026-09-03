// progrmaciones.associations.js

module.exports = (db) => {

  // ==========================================================
  // Ruta - ProgramacionRuta (1:N)
  // ==========================================================
  db.Ruta.hasMany(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },
    sourceKey: 'id_ruta',
    as: 'programaciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionRuta.belongsTo(db.Ruta, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },
    targetKey: 'id_ruta',
    as: 'ruta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // RutaVersion - ProgramacionRuta (1:N)
  // ==========================================================
  db.RutaVersion.hasMany(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_ruta_version',
      allowNull: false,
    },
    sourceKey: 'id_ruta_version',
    as: 'programaciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionRuta.belongsTo(db.RutaVersion, {
    foreignKey: {
      name: 'id_ruta_version',
      allowNull: false,
    },
    targetKey: 'id_ruta_version',
    as: 'version_ruta',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Vehiculo - ProgramacionRuta (1:N)
  // ==========================================================
  db.Vehiculo.hasMany(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_vehiculo',
      allowNull: false,
    },
    sourceKey: 'id_vehiculo',
    as: 'programaciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionRuta.belongsTo(db.Vehiculo, {
    foreignKey: {
      name: 'id_vehiculo',
      allowNull: false,
    },
    targetKey: 'id_vehiculo',
    as: 'vehiculo',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // Usuario creador - ProgramacionRuta (1:N)
  // ==========================================================
  db.Usuario.hasMany(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_usuario_creacion',
      allowNull: false,
    },
    sourceKey: 'id_usuario',
    as: 'programaciones_creadas',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionRuta.belongsTo(db.Usuario, {
    foreignKey: {
      name: 'id_usuario_creacion',
      allowNull: false,
    },
    targetKey: 'id_usuario',
    as: 'creador',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // ProgramacionRuta - ProgramacionPersonal (1:N)
  // ==========================================================
  db.ProgramacionRuta.hasMany(db.ProgramacionPersonal, {
    foreignKey: {
      name: 'id_programacion',
      allowNull: false,
    },
    sourceKey: 'id_programacion',
    as: 'personal_asignado',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionPersonal.belongsTo(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_programacion',
      allowNull: false,
    },
    targetKey: 'id_programacion',
    as: 'programacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // PersonalOperativo - ProgramacionPersonal (1:N)
  // ==========================================================
  db.PersonalOperativo.hasMany(db.ProgramacionPersonal, {
    foreignKey: {
      name: 'id_personal',
      allowNull: false,
    },
    sourceKey: 'id_personal',
    as: 'asignaciones',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  db.ProgramacionPersonal.belongsTo(db.PersonalOperativo, {
    foreignKey: {
      name: 'id_personal',
      allowNull: false,
    },
    targetKey: 'id_personal',
    as: 'personal',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // ==========================================================
  // ProgramacionRuta - PersonalOperativo (N:M)
  // ==========================================================
  db.ProgramacionRuta.belongsToMany(db.PersonalOperativo, {
    through: db.ProgramacionPersonal,
    foreignKey: 'id_programacion',
    otherKey: 'id_personal',
    as: 'equipo',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.PersonalOperativo.belongsToMany(db.ProgramacionRuta, {
    through: db.ProgramacionPersonal,
    foreignKey: 'id_personal',
    otherKey: 'id_programacion',
    as: 'programaciones_asignadas',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // ProgramacionRuta - ProgramacionHistorial (1:N)
  // ==========================================================
  db.ProgramacionRuta.hasMany(db.ProgramacionHistorial, {
    foreignKey: {
      name: 'id_programacion',
      allowNull: false,
    },
    sourceKey: 'id_programacion',
    as: 'historial',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.ProgramacionHistorial.belongsTo(db.ProgramacionRuta, {
    foreignKey: {
      name: 'id_programacion',
      allowNull: false,
    },
    targetKey: 'id_programacion',
    as: 'programacion',
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // Usuario actor - ProgramacionHistorial (1:N)
  // ==========================================================
  db.Usuario.hasMany(db.ProgramacionHistorial, {
    foreignKey: {
      name: 'id_usuario',
      allowNull: true,
    },
    sourceKey: 'id_usuario',
    as: 'historial_programaciones',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  );

  db.ProgramacionHistorial.belongsTo(db.Usuario, {
    foreignKey: {
      name: 'id_usuario',
      allowNull: true,
    },
    targetKey: 'id_usuario',
    as: 'actor',
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  );
};