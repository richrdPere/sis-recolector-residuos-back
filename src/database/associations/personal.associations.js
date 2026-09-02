// personal.associations.js

module.exports = (db) => {

	// ==========================================================
	// Usuario - PersonalOperativo (1:1)
	// ==========================================================
	db.Usuario.hasOne(db.PersonalOperativo, {
		foreignKey: 'id_usuario',
		sourceKey: 'id_usuario',
		as: 'perfil_laboral',
		onUpdate: 'CASCADE',
		onDelete: 'RESTRICT',
	});

	db.PersonalOperativo.belongsTo(db.Usuario, {
		foreignKey: 'id_usuario',
		targetKey: 'id_usuario',
		as: 'usuario',
		onUpdate: 'CASCADE',
		onDelete: 'RESTRICT',
	});

	// ==========================================================
	// PersonalOperativo - ConductorPerfil (1:1)
	// ==========================================================
	db.PersonalOperativo.hasOne(db.ConductorPerfil, {
		foreignKey: 'id_personal',
		sourceKey: 'id_personal',
		as: 'conductor',
		onUpdate: 'CASCADE',
		onDelete: 'RESTRICT',
	});

	db.ConductorPerfil.belongsTo(db.PersonalOperativo, {
		foreignKey: 'id_personal',
		targetKey: 'id_personal',
		as: 'personal',
		onUpdate: 'CASCADE',
		onDelete: 'RESTRICT',
	});
};