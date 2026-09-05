const { DataTypes } = require('sequelize');
const sequelize = require('../../../config/database');

const CiudadanoPreferenciaNotificacion = sequelize.define('CiudadanoPreferenciaNotificacion', {
	id_preferencia: {
		type:
			DataTypes.BIGINT,

		primaryKey: true,
		autoIncrement: true,
	},

	/*
	|--------------------------------------------------------------------------
	| Ciudadano
	|--------------------------------------------------------------------------
	|
	| Cada ciudadano mantiene una sola configuración de notificaciones.
	|
	*/

	id_ciudadano: {
		type:
			DataTypes.BIGINT,

		allowNull: false,
		unique: true,

		references: {
			model:
				'ciudadanos',

			key:
				'id_ciudadano',
		},

		onUpdate:
			'CASCADE',

		onDelete:
			'RESTRICT',
	},

	/*
	|--------------------------------------------------------------------------
	| Canal de notificación
	|--------------------------------------------------------------------------
	*/

	notificaciones_habilitadas: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	canal_push: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	canal_interno: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	/*
	|--------------------------------------------------------------------------
	| Preferencias por evento
	|--------------------------------------------------------------------------
	*/

	notificar_recordatorio: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_inicio_ruta: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_proximidad_vehiculo: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_cambio_horario: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_cambio_ruta: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_cancelacion: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	notificar_incidencias: {
		type:
			DataTypes.BOOLEAN,

		allowNull: false,
		defaultValue: true,
	},

	/*
	|--------------------------------------------------------------------------
	| Anticipación del recordatorio
	|--------------------------------------------------------------------------
	*/

	minutos_anticipacion: {
		type:
			DataTypes.INTEGER
				.UNSIGNED,

		allowNull: false,
		defaultValue: 120,

		validate: {
			min: {
				args: [15],

				msg:
					'La anticipación mínima es de 15 minutos.',
			},

			max: {
				args: [10080],

				msg:
					'La anticipación máxima es de 7 días.',
			},
		},
	},

	/*
	|--------------------------------------------------------------------------
	| Frecuencia y horario
	|--------------------------------------------------------------------------
	*/

	frecuencia_recordatorio: {
		type:
			DataTypes.ENUM(
				'SIEMPRE',
				'SOLO_UNA_VEZ',
			),

		allowNull: false,
		defaultValue:
			'SOLO_UNA_VEZ',
	},

	hora_silencio_inicio: {
		type:
			DataTypes.TIME,

		allowNull: true,
	},

	hora_silencio_fin: {
		type:
			DataTypes.TIME,

		allowNull: true,
	},

	/*
	|--------------------------------------------------------------------------
	| Estado
	|--------------------------------------------------------------------------
	*/

	estado_preferencia: {
		type:
			DataTypes.ENUM(
				'ACTIVA',
				'INACTIVA',
			),

		allowNull: false,
		defaultValue:
			'ACTIVA',
	},
},
	{
		tableName:
			'ciudadano_preferencias_notificacion',

		timestamps: true,
		paranoid: true,

		createdAt:
			'created_at',

		updatedAt:
			'updated_at',

		deletedAt:
			'deleted_at',

		indexes: [
			{
				unique: true,

				fields: [
					'id_ciudadano',
				],

				name:
					'uk_preferencia_ciudadano',
			},
			{
				fields: [
					'notificaciones_habilitadas',
					'estado_preferencia',
				],

				name:
					'idx_preferencia_notificaciones_estado',
			},
			{
				fields: [
					'notificar_recordatorio',
				],

				name:
					'idx_preferencia_recordatorio',
			},
		],

		validate: {
			/*
			|--------------------------------------------------------------------------
			| Canal disponible
			|--------------------------------------------------------------------------
			*/

			canalDisponible() {
				if (
					this
						.notificaciones_habilitadas &&
					!this.canal_push &&
					!this.canal_interno
				) {
					throw new Error(
						'Debe habilitar al menos un canal de notificación.',
					);
				}
			},

			/*
			|--------------------------------------------------------------------------
			| Horario de silencio completo
			|--------------------------------------------------------------------------
			*/

			horarioSilencioCompleto() {
				const tieneInicio =
					Boolean(
						this
							.hora_silencio_inicio,
					);

				const tieneFin =
					Boolean(
						this
							.hora_silencio_fin,
					);

				if (
					tieneInicio !==
					tieneFin
				) {
					throw new Error(
						'Debe registrar conjuntamente el inicio y fin del horario de silencio.',
					);
				}
			},

			/*
			|--------------------------------------------------------------------------
			| Estado consistente
			|--------------------------------------------------------------------------
			*/

			estadoConsistente() {
				if (
					this
						.estado_preferencia ===
					'INACTIVA' &&
					this
						.notificaciones_habilitadas
				) {
					throw new Error(
						'Una preferencia inactiva no puede tener las notificaciones habilitadas.',
					);
				}
			},
		},
	},
);

module.exports = CiudadanoPreferenciaNotificacion;