const AppError = require('../../../../utils/app-error');
const { enqueueNotification } = require('../../../../jobs/notification-worker');

const VIGENCIA_MINUTOS = {
	INICIO_RUTA: 90,
	CAMBIO_HORARIO: 1440,
	CAMBIO_RUTA: 1440,
	CANCELACION: 1440,
	INCIDENCIA: 1440,
	PROXIMIDAD_VEHICULO: 2,
};

const crearAvisoCiudadano = async ({
	evento,
	idRuta = null,
	idZona = null,
	idDomicilio = null,
	tipoEntidad,
	idEntidad,
	claveEvento,
	titulo,
	mensaje,
	datos = {},
	prioridad = 'NORMAL',
	idUsuarioCreacion = null,
	fechaEvento = new Date(),
	transaction,
}) => {
	if (!transaction || transaction.finished) {
		throw new AppError(
			'El aviso ciudadano requiere una transacción activa.',
			500,
			'CITIZEN_NOTICE_TRANSACTION_REQUIRED',
		);
	}

	const vigencia = VIGENCIA_MINUTOS[evento];

	if (!Object.hasOwn(VIGENCIA_MINUTOS, evento)) {
		throw new AppError(
			'El evento de aviso ciudadano no está configurado.',
			500,
			'INVALID_CITIZEN_NOTICE_EVENT',
		);
	}

	const fecha = new Date(fechaEvento);

	if (!Number.isFinite(fecha.getTime())) {
		throw new AppError(
			'La fecha del evento ciudadano no es válida.',
			500,
			'INVALID_CITIZEN_NOTICE_DATE',
		);
	}

	const fechaExpiracion = new Date(
		fecha.getTime() + vigencia * 60_000,
	);

	if (fechaExpiracion.getTime() <= Date.now()) {
		return { creadas: 0, duplicadas: 0, omitida: 'EXPIRADA' };
	}

	return enqueueNotification({
		notificacion: {
			tipo_notificacion:
				evento === 'CANCELACION' ? 'CANCELACION_RUTA' : evento,
			titulo,
			mensaje,
			prioridad,
			enviar_interna: true,
			enviar_push: true,
			tipo_entidad: tipoEntidad,
			id_entidad: idEntidad,
			datos: {
				...datos,
				evento,
				...(idRuta != null && { id_ruta: idRuta }),
				...(idZona != null && { id_zona: idZona }),
				...(idDomicilio != null && { id_domicilio: idDomicilio }),
			},
			clave_evento: claveEvento,
			fecha_expiracion: fechaExpiracion,
			origen: 'SISTEMA',
		},
		destino: {
			tipo_destino: 'CIUDADANOS',
			evento,
			id_ruta: idRuta,
			id_zona: idZona,
			id_domicilio: idDomicilio,
		},
		id_usuario_creacion: idUsuarioCreacion,
		transaction,
	});
};

module.exports = crearAvisoCiudadano;