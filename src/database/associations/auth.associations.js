// auth.associations.js

module.exports = (db) => {

  // ==========================================================
  // Persona - Usuario
  // ==========================================================
  db.Persona.hasOne(db.Usuario, {
    foreignKey: "id_persona",
    as: "usuario",
  });

  db.Usuario.belongsTo(db.Persona, {
    foreignKey: "id_persona",
    as: "persona",
  });

  // ==========================================================
  // Usuario - Rol (N:M)
  // ==========================================================
  db.Usuario.belongsToMany(db.Roles, {
    through: db.UsuarioRol,
    foreignKey: "id_usuario",
    otherKey: "id_rol",
    as: "roles",
  });

  db.Roles.belongsToMany(db.Usuario, {
    through: db.UsuarioRol,
    foreignKey: "id_rol",
    otherKey: "id_usuario",
    as: "usuarios",
  });

  // ==========================================================
  // Usuario - UsuarioRol
  // ==========================================================
  db.Usuario.hasMany(db.UsuarioRol, {
    foreignKey: 'id_usuario',
    as: 'usuario_roles',
  });

  db.UsuarioRol.belongsTo(db.Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario',
  });

  // ==========================================================
  // Rol - UsuarioRol
  // ==========================================================
  db.Roles.hasMany(db.UsuarioRol, {
    foreignKey: 'id_rol',
    as: 'usuario_roles',
  });

  db.UsuarioRol.belongsTo(db.Roles, {
    foreignKey: 'id_rol',
    as: 'rol',
  });

  // ==========================================================
  // Usuario - RefreshToken (1:N)
  // ==========================================================
  db.Usuario.hasMany(db.RefreshToken, {
    foreignKey: 'id_usuario',
    as: 'sesiones',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  );

  db.RefreshToken.belongsTo(db.Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario',
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  );

};