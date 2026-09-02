module.exports = (db) => {

  // ==========================================================
  // Zona - Ruta (1:N)
  // ==========================================================
  db.Zona.hasMany(db.Ruta, {
    foreignKey: {
      name: 'id_zona',
      allowNull: false,
    },

    sourceKey: 'id_zona',

    as: 'rutas',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.Ruta.belongsTo(db.Zona, {
    foreignKey: {
      name: 'id_zona',
      allowNull: false,
    },

    targetKey: 'id_zona',

    as: 'zona',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // Ruta - RutaVersion (1:N)
  // ==========================================================
  db.Ruta.hasMany(db.RutaVersion, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },

    sourceKey: 'id_ruta',

    as: 'versiones',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.RutaVersion.belongsTo(db.Ruta, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },

    targetKey: 'id_ruta',

    as: 'ruta',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // Ruta - Versión vigente (1:1 lógico)
  // ==========================================================
  db.Ruta.hasOne(db.RutaVersion, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },

    sourceKey: 'id_ruta',

    as: 'version_vigente',

    scope: {
      vigente: true,
      estado: true,
    },

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // RutaVersion - RutaPunto (1:N)
  // ==========================================================
  db.RutaVersion.hasMany(db.RutaPunto, {
    foreignKey: {
      name:
        'id_ruta_version',

      allowNull: false,
    },

    sourceKey:
      'id_ruta_version',

    as: 'puntos',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.RutaPunto.belongsTo(db.RutaVersion, {
    foreignKey: {
      name:
        'id_ruta_version',

      allowNull: false,
    },

    targetKey:
      'id_ruta_version',

    as: 'version',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  // ==========================================================
  // Ruta - RutaHorario (1:N)
  // ==========================================================
  db.Ruta.hasMany(db.RutaHorario, {
    foreignKey: {
      name: 'id_ruta',
      allowNull: false,
    },

    sourceKey: 'id_ruta',

    as: 'horarios',

    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  );

  db.RutaHorario.belongsTo(
    db.Ruta,
    {
      foreignKey: {
        name: 'id_ruta',
        allowNull: false,
      },

      targetKey: 'id_ruta',

      as: 'ruta',

      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    },
  );
};