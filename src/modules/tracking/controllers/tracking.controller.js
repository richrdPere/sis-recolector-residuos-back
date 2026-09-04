const {
  registerLocationService,
  registerLocationBatchService,
  getLastLocationService,
  getRoutePositionsService,
  getActiveVehicleLocationsService,
} = require('../services');

const { getTrackingMetadata } = require('../utils/tracking-controller.utils');

// ===============================================
// Emitir ubicación por Socket.IO
// ===============================================
const emitLocationUpdate = (req, result,) => {
  /*
  | Se asume que Socket.IO fue registrado con:
  |
  | app.set('io', io);
  */

  const io = req.app.get('io');

  if (
    !io ||
    !result ||
    result.duplicada ||
    !result
      .ultima_ubicacion_actualizada
  ) {
    return;
  }

  const posicion = result.posicion;

  if (!posicion) {
    return;
  }

  const data = {
    id_recorrido: posicion.id_recorrido,
    id_posicion: posicion.id_posicion,
    latitud: posicion.latitud,
    longitud: posicion.longitud,
    precision_gps: posicion.precision_gps,
    altitud: posicion.altitud,
    velocidad_mps: posicion.velocidad_mps,
    rumbo: posicion.rumbo,
    nivel_bateria: posicion.nivel_bateria,
    fecha_dispositivo: posicion.fecha_dispositivo,
    fecha_recepcion: posicion.fecha_recepcion,
  };

  /*
  | Sala específica del recorrido.
  */

  io
    .to(
      `recorrido:${posicion.id_recorrido}`,
    )
    .emit(
      'tracking:ubicacion',
      data,
    );

  /*
  | Sala general del panel municipal.
  */

  io
    .to('operadores')
    .emit(
      'tracking:ubicacion',
      data,
    );
};

/*
|--------------------------------------------------------------------------
| 1. Registrar ubicación
|--------------------------------------------------------------------------
*/
const registerLocationController = async (req, res, next) => {
  try {
    const metadata = getTrackingMetadata(req);

    const data =
      await registerLocationService(
        req.body,
        metadata,
      );

    /*
    | El service ya confirmó la transacción.
    | Recién después emitimos por Socket.IO.
    */

    emitLocationUpdate(
      req,
      data,
    );

    return res
      .status(
        data.duplicada
          ? 200
          : 201,
      )
      .json({
        success:
          true,

        message:
          data.duplicada
            ? 'La ubicación ya había sido registrada.'
            : 'Ubicación registrada correctamente.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Registrar lote de ubicaciones
|--------------------------------------------------------------------------
*/
const registerLocationBatchController = async (req, res, next) => {
  try {
    const metadata = getTrackingMetadata(req);

    const data = await registerLocationBatchService(
      req.body,
      metadata,
    );

    /*
    | El lote puede contener resultados parciales.
    | El panel puede volver a consultar la última
    | ubicación después de recibir este evento.
    */

    const io = req.app.get('io');

    if (
      io &&
      data.registradas > 0
    ) {
      io
        .to('operadores')
        .emit(
          'tracking:sincronizado',
          {
            id_recorrido:
              req.body
                .id_recorrido,

            registradas:
              data.registradas,

            duplicadas:
              data.duplicadas,

            rechazadas:
              data.rechazadas,

            fecha_recepcion:
              new Date(),
          },
        );
    }

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          data.rechazadas > 0
            ? 'El lote fue procesado con algunas ubicaciones rechazadas.'
            : 'Lote de ubicaciones procesado correctamente.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener última ubicación
|--------------------------------------------------------------------------
*/
const getLastLocationController = async (req, res, next) => {
  try {
    const data =
      await getLastLocationService(
        req.params.idRecorrido,
      );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Última ubicación obtenida correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtener posiciones del recorrido
|--------------------------------------------------------------------------
*/
const getRoutePositionsController = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      fecha_desde = null,
      fecha_hasta = null,
      solo_validas = true,
    } = req.query;

    const data =
      await getRoutePositionsService({
        id_recorrido:
          req.params
            .idRecorrido,

        page,
        limit,
        fecha_desde,
        fecha_hasta,
        solo_validas,
      });

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          data.items.length
            ? 'Posiciones obtenidas correctamente.'
            : 'El recorrido no tiene posiciones para los filtros indicados.',

        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Obtener ubicaciones de vehículos activos
|--------------------------------------------------------------------------
*/
const getActiveVehicleLocationsController = async (req, res, next) => {
  try {
    const data = await getActiveVehicleLocationsService();

    return res
      .status(200)
      .json({
        success: true,
        message: data.length
          ? 'Vehículos activos obtenidos correctamente.'
          : 'No existen vehículos en recorrido actualmente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerLocationController,
  registerLocationBatchController,
  getLastLocationController,
  getRoutePositionsController,
  getActiveVehicleLocationsController,
};