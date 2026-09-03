// Services
const {
  iniciarRecorridoService,
  getRecorridoActivoService,
  getRecorridoByIdService,
  pausarRecorridoService,
  reanudarRecorridoService,
  finalizarRecorridoService,
  cancelarRecorridoService,
} = require(
  '../services',
);

const {
  getRequestMetadata,
  getAuthenticatedUserId,
} = require(
  '../utils/controller.utils',
);

/*
|--------------------------------------------------------------------------
| Obtener clave de idempotencia
|--------------------------------------------------------------------------
|
| Se admite mediante el header Idempotency-Key y, como respaldo, desde
| el body. Para la aplicación móvil es preferible utilizar el header.
|
*/

const getIdempotencyKey = (
  req,
) => {
  return (
    req.get(
      'idempotency-key',
    ) ||
    req.body
      ?.clave_idempotencia ||
    null
  );
};

/*
|--------------------------------------------------------------------------
| 1. Iniciar recorrido
|--------------------------------------------------------------------------
*/
const iniciarRecorridoController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await iniciarRecorridoService({
      id_programacion:
        req.params
          .idProgramacion,

      id_usuario:
        getAuthenticatedUserId(
          req,
        ),

      fecha_evento:
        req.body.fecha_evento,

      latitud:
        req.body.latitud,

      longitud:
        req.body.longitud,

      precision_gps:
        req.body.precision_gps,

      kilometraje:
        req.body.kilometraje,

      observacion:
        req.body.observacion,

      clave_idempotencia:
        getIdempotencyKey(req),

      origen:
        metadata.origen,

      ip:
        metadata.ip,

      user_agent:
        metadata.user_agent,
    });

    return res
      .status(201)
      .json({
        success: true,
        message:
          'Recorrido iniciado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener recorrido activo del usuario
|--------------------------------------------------------------------------
*/
const getRecorridoActivoController = async (req, res, next) => {
  try {
    const data =
      await getRecorridoActivoService({
        id_usuario:
          getAuthenticatedUserId(
            req,
          ),
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido activo obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener recorrido por ID
|--------------------------------------------------------------------------
*/
const getRecorridoByIdController = async (req, res, next) => {
  try {
    const data =
      await getRecorridoByIdService({
        id_recorrido:
          req.params
            .idRecorrido,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Pausar recorrido
|--------------------------------------------------------------------------
*/
const pausarRecorridoController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await pausarRecorridoService({
      id_recorrido:
        req.params
          .idRecorrido,

      id_usuario:
        getAuthenticatedUserId(
          req,
        ),

      fecha_evento:
        req.body.fecha_evento,

      latitud:
        req.body.latitud,

      longitud:
        req.body.longitud,

      precision_gps:
        req.body.precision_gps,

      observacion:
        req.body.observacion,

      clave_idempotencia:
        getIdempotencyKey(req),

      origen:
        metadata.origen,

      ip:
        metadata.ip,

      user_agent:
        metadata.user_agent,
    });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido pausado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Reanudar recorrido
|--------------------------------------------------------------------------
*/
const reanudarRecorridoController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(req);

    const data =
      await reanudarRecorridoService({
        id_recorrido: req.params.idRecorrido,
        id_usuario: getAuthenticatedUserId(req),
        fecha_evento: req.body.fecha_evento,
        latitud: req.body.latitud,
        longitud: req.body.longitud,
        precision_gps: req.body.precision_gps,
        observacion: req.body.observacion,
        clave_idempotencia: getIdempotencyKey(req),
        origen: metadata.origen,
        ip: metadata.ip,
        user_agent: metadata.user_agent,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido reanudado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Finalizar recorrido
|--------------------------------------------------------------------------
*/
const finalizarRecorridoController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(req);

    const data =
      await finalizarRecorridoService({
        id_recorrido:
          req.params
            .idRecorrido,

        id_usuario:
          getAuthenticatedUserId(
            req,
          ),

        fecha_evento:
          req.body.fecha_evento,

        latitud:
          req.body.latitud,

        longitud:
          req.body.longitud,

        precision_gps:
          req.body.precision_gps,

        kilometraje:
          req.body.kilometraje,

        observacion:
          req.body.observacion,

        clave_idempotencia:
          getIdempotencyKey(req),

        origen:
          metadata.origen,

        ip:
          metadata.ip,

        user_agent:
          metadata.user_agent,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido finalizado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Cancelar recorrido
|--------------------------------------------------------------------------
*/
const cancelarRecorridoController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(req);

    const data =
      await cancelarRecorridoService({
        id_recorrido:
          req.params
            .idRecorrido,

        id_usuario:
          getAuthenticatedUserId(
            req,
          ),

        motivo:
          req.body.motivo,

        fecha_evento:
          req.body.fecha_evento,

        latitud:
          req.body.latitud,

        longitud:
          req.body.longitud,

        observacion:
          req.body.observacion,

        clave_idempotencia:
          getIdempotencyKey(req),

        origen:
          metadata.origen,

        ip:
          metadata.ip,

        user_agent:
          metadata.user_agent,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          'Recorrido cancelado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  iniciarRecorridoController,
  getRecorridoActivoController,
  getRecorridoByIdController,
  pausarRecorridoController,
  reanudarRecorridoController,
  finalizarRecorridoController,
  cancelarRecorridoController,
};