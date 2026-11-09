const { Op } = require('sequelize');

const db = require('../../../database/models');

const getPuntos = require('../../recolecciones/services/get-route-collection-points.service');

const { calcularEta } = require('../utils/eta.utils');

const getAddressEtaService = async ({
	recorrido,
	version,
	domicilio,
	transaction,
}) => {
	const estado = recorrido.estado_recorrido;

	const entrada = {
		estado,

		geometria:
			version?.geometria_geojson,

		domicilio,

		ahora: new Date(),

		config: {
			velocidadKmh:
				process.env.ETA_VELOCIDAD_KMH,

			paradaMin:
				process.env.ETA_MINUTOS_PARADA,

			radioDomicilio:
				process.env.ETA_RADIO_DOMICILIO_METROS,
		},
	};

	if (estado !== 'EN_CURSO') {
		return calcularEta(entrada);
	}

	const puntos = await getPuntos(
		recorrido.id_recorrido,
		{ transaction },
	);

	const ultima = recorrido.get(
		'ultima_ubicacion',
	);

	// Recuperar la muestra original permite comprobar
	// precisión, validez y ubicación simulada.
	const actual = ultima?.id_posicion
		? await db.RecorridoPosicion.findOne({
			where: {
				id_posicion:
					ultima.id_posicion,

				id_recorrido:
					recorrido.id_recorrido,
			},

			transaction,
			raw: true,
		})
		: null;

	const posiciones = actual
		? [actual]
		: [];

	const fecha = actual?.fecha_dispositivo
		? new Date(
			actual.fecha_dispositivo,
		).getTime()
		: NaN;

	if (Number.isFinite(fecha)) {
		const anteriores =
			await db.RecorridoPosicion.findAll({
				where: {
					id_recorrido:
						recorrido.id_recorrido,

					fecha_dispositivo: {
						[Op.gte]: new Date(
							entrada.ahora.getTime() - 120000,
						),

						[Op.lte]: new Date(
							fecha - 15000,
						),
					},
				},

				order: [
					['fecha_dispositivo', 'DESC'],
					['id_posicion', 'DESC'],
				],

				limit: 10,

				transaction,
				raw: true,
			});

		posiciones.push(
			...anteriores,
		);
	}

	return calcularEta({
		...entrada,
		puntos,
		posiciones,
	});
};

module.exports = getAddressEtaService;