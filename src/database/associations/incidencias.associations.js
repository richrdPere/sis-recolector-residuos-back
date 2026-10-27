// ==========================================================
// ASOCIACIONES: INCIDENCIAS
// ==========================================================

module.exports = (db) => {

	const {
		Incidencia,
		IncidenciaArchivo,
		Usuario,
		Recorrido,
		Zona,
		Ruta,
	} = db;

	// --------------------------------------------------------
	// USUARIO REPORTANTE
	// --------------------------------------------------------

	Usuario.hasMany(Incidencia, {
		foreignKey: "id_usuario_reporte",
		as: "incidencias_reportadas",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	Incidencia.belongsTo(Usuario, {
		foreignKey: "id_usuario_reporte",
		as: "reportante",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// USUARIO RESPONSABLE
	// --------------------------------------------------------

	Usuario.hasMany(Incidencia, {
		foreignKey: "id_responsable",
		as: "incidencias_asignadas",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	Incidencia.belongsTo(Usuario, {
		foreignKey: "id_responsable",
		as: "responsable",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// RECORRIDO
	// --------------------------------------------------------

	Recorrido.hasMany(Incidencia, {
		foreignKey: "id_recorrido",
		as: "incidencias",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	Incidencia.belongsTo(Recorrido, {
		foreignKey: "id_recorrido",
		as: "recorrido",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// ZONA
	// --------------------------------------------------------

	Zona.hasMany(Incidencia, {
		foreignKey: "id_zona",
		as: "incidencias",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	Incidencia.belongsTo(Zona, {
		foreignKey: "id_zona",
		as: "zona",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// RUTA
	// --------------------------------------------------------

	Ruta.hasMany(Incidencia, {
		foreignKey: "id_ruta",
		as: "incidencias",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	Incidencia.belongsTo(Ruta, {
		foreignKey: "id_ruta",
		as: "ruta",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// ARCHIVOS DE LA INCIDENCIA
	// --------------------------------------------------------

	Incidencia.hasMany(IncidenciaArchivo, {
		foreignKey: "id_incidencia",
		as: "archivos",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	IncidenciaArchivo.belongsTo(Incidencia, {
		foreignKey: "id_incidencia",
		as: "incidencia",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	// --------------------------------------------------------
	// USUARIO QUE CARGA EL ARCHIVO
	// --------------------------------------------------------

	Usuario.hasMany(IncidenciaArchivo, {
		foreignKey: "id_usuario_carga",
		as: "archivos_incidencias_cargados",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});

	IncidenciaArchivo.belongsTo(Usuario, {
		foreignKey: "id_usuario_carga",
		as: "usuario_carga",
		onUpdate: "CASCADE",
		onDelete: "RESTRICT",
	});
};