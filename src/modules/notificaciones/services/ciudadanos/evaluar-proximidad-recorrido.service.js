const { Op } = require('sequelize');
const db = require('../../../../database/models');

const crearAvisoCiudadano = require(
  './crear-aviso-ciudadano.service',
);

const RADIO_METROS = 300;
const PRECISION_MAXIMA_METROS = 50;
const ANTIGUEDAD_MAXIMA_MS = 60_000;
const DESFASE_FUTURO_MAXIMO_MS = 5_000;

const radianes = (grados) => grados * Math.PI / 180;

const distanciaMetros = (origen, destino) => {
  const latOrigen = radianes(Number(origen.latitud));
  const latDestino = radianes(Number(destino.latitud));
  const deltaLatitud = latDestino - latOrigen;
  const deltaLongitud = radianes(
    Number(destino.longitud) - Number(origen.longitud),
  );

  const a = Math.sin(deltaLatitud / 2) ** 2
    + Math.cos(latOrigen) * Math.cos(latDestino)
    * Math.sin(deltaLongitud / 2) ** 2;

  return 2 * 6_371_000 * Math.asin(
    Math.sqrt(Math.min(1, Math.max(0, a))),
  );
};

const posicionUtilizable = (posicion, ahora, inicioRecorrido) => {
  if (
    !posicion ||
    !posicion.es_valida ||
    posicion.es_ubicacion_simulada ||
    posicion.origen !== 'MOVIL' ||
    posicion.precision_gps == null ||
    posicion.fecha_dispositivo == null ||
    posicion.fecha_recepcion == null
  ) {
    return false;
  }

  const precision = Number(posicion.precision_gps);
  const captura = new Date(posicion.fecha_dispositivo).getTime();
  const recepcion = new Date(posicion.fecha_recepcion).getTime();

  return Number.isFinite(precision)
    && precision >= 0
    && precision <= PRECISION_MAXIMA_METROS
    && captura >= inicioRecorrido
    && captura >= ahora - ANTIGUEDAD_MAXIMA_MS
    && captura <= ahora + DESFASE_FUTURO_MAXIMO_MS
    && recepcion >= ahora - ANTIGUEDAD_MAXIMA_MS
    && recepcion <= ahora
    && captura <= recepcion + DESFASE_FUTURO_MAXIMO_MS;
};

const evaluarRecorrido = async (idRecorrido) => {
  return db.sequelize.transaction(async (transaction) => {
    // Serializa la evaluación con el registro de tracking
    // y con las transiciones del recorrido.
    const recorrido = await db.Recorrido.findByPk(idRecorrido, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!recorrido || recorrido.estado_recorrido !== 'EN_CURSO') {
      return 0;
    }

    const ahora = Date.now();
    const inicioRecorrido = new Date(
      recorrido.fecha_hora_inicio,
    ).getTime();

    const ultimaUbicacion = await db.RecorridoUltimaUbicacion.findOne({
      where: { id_recorrido: idRecorrido },
      transaction,
    });

    if (!ultimaUbicacion) return 0;

    // Leer las dos últimas posiciones recibidas sin filtrar por validez.
    // Una muestra inválida entre ellas corta la confirmación.
    const [actual, anterior] = await db.RecorridoPosicion.findAll({
      where: { id_recorrido: idRecorrido },
      order: [['id_posicion', 'DESC']],
      limit: 2,
      transaction,
    });

    if (
      !posicionUtilizable(actual, ahora, inicioRecorrido) ||
      !posicionUtilizable(anterior, ahora, inicioRecorrido) ||
      String(actual.id_posicion) !== String(ultimaUbicacion.id_posicion) ||
      new Date(actual.fecha_dispositivo).getTime() <=
      new Date(anterior.fecha_dispositivo).getTime()
    ) {
      return 0;
    }

    const programacion = await db.ProgramacionRuta.findByPk(
      recorrido.id_programacion,
      { transaction },
    );

    if (!programacion?.id_ruta) return 0;

    const latitud = Number(actual.latitud);
    const longitud = Number(actual.longitud);

    // Área de preselección para las zonas locales de Calca.
    const margenLatitud = RADIO_METROS / 110_000;
    const margenLongitud = margenLatitud / Math.cos(radianes(latitud));

    const domicilios = await db.CiudadanoDomicilio.findAll({
      where: {
        id_ruta: programacion.id_ruta,
        estado_domicilio: 'ACTIVO',
        latitud: {
          [Op.between]: [
            latitud - margenLatitud,
            latitud + margenLatitud,
          ],
        },
        longitud: {
          [Op.between]: [
            longitud - margenLongitud,
            longitud + margenLongitud,
          ],
        },
      },
      attributes: ['id_domicilio', 'latitud', 'longitud'],
      order: [['id_domicilio', 'ASC']],
      transaction,
    });

    let creadas = 0;

    for (const domicilio of domicilios) {
      if (
        distanciaMetros(actual, domicilio) > RADIO_METROS ||
        distanciaMetros(anterior, domicilio) > RADIO_METROS
      ) {
        continue;
      }

      // El procesamiento de otros domicilios puede tomar tiempo.
      if (!posicionUtilizable(actual, Date.now(), inicioRecorrido)) {
        break;
      }

      const resultado = await crearAvisoCiudadano({
        evento: 'PROXIMIDAD_VEHICULO',
        idRuta: programacion.id_ruta,
        idDomicilio: domicilio.id_domicilio,
        tipoEntidad: 'RECORRIDO',
        idEntidad: recorrido.id_recorrido,
        claveEvento:
          `PROXIMIDAD:RECORRIDO:${recorrido.id_recorrido}`
          + `:DOMICILIO:${domicilio.id_domicilio}`,
        titulo: 'El vehículo recolector está cerca',
        mensaje:
          'El vehículo de tu ruta se encuentra cerca de tu domicilio. '
          + 'Consulta el mapa para ver el avance de la recolección.',
        datos: {
          id_recorrido: recorrido.id_recorrido,
          id_programacion: programacion.id_programacion,
          destino_app: 'MAPA',
        },
        // La vigencia se cuenta desde la captura de la posición.
        fechaEvento: actual.fecha_dispositivo,
        transaction,
      });

      creadas += resultado.creadas;
    }

    return creadas;
  });
};

const evaluarProximidadRecorridos = async () => {
  const limite = new Date(Date.now() - ANTIGUEDAD_MAXIMA_MS);

  const recorridos = await db.Recorrido.findAll({
    where: { estado_recorrido: 'EN_CURSO' },
    attributes: ['id_recorrido'],
    include: [{
      association: 'ultima_ubicacion',
      required: true,
      attributes: [],
      where: {
        fecha_dispositivo: { [Op.gte]: limite },
        es_ubicacion_simulada: false,
      },
    }],
  });

  const resumen = { creadas: 0, errores: 0 };

  for (const recorrido of recorridos) {
    try {
      resumen.creadas += await evaluarRecorrido(recorrido.id_recorrido);
    } catch (error) {
      resumen.errores++;
      console.error(
        '[proximidad:recorrido]',
        String(recorrido.id_recorrido),
        error.code || error.name,
      );
    }
  }

  return resumen;
};

module.exports = evaluarProximidadRecorridos;