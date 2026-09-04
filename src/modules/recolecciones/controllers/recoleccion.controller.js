const {
  registerCollectionService,
  registerCollectionBatchService,
  getCollectionByIdService,
  getRouteCollectionPointsService,
  getRouteProgressService,
  annulCollectionService,
  registerEvidenceService,
  getCollectionEvidencesService,
  annulEvidenceService,
  getRecorridoCapacidadService,
} = require('../services');

const { getRequestMetadata } = require('../utils/recoleccion-controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Registrar recolección
|--------------------------------------------------------------------------
*/
const registerCollectionController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(
        req,
      );

    const data =
      await registerCollectionService(
        req.body,
        metadata,
      );

    return res
      .status(
        data.duplicada
          ? 200
          : 201,
      )
      .json({
        success: true,
        message: data.duplicada
          ? 'La recolección ya había sido registrada.'
          : 'Recolección registrada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Registrar lote offline
|--------------------------------------------------------------------------
*/
const registerCollectionBatchController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await registerCollectionBatchService(
      req.body,
      metadata,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: data.rechazadas > 0
          ? 'El lote fue procesado con algunas recolecciones rechazadas.'
          : 'Lote de recolecciones procesado correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener recolección por ID
|--------------------------------------------------------------------------
*/
const getCollectionByIdController = async (req, res, next) => {
  try {
    const data =
      await getCollectionByIdService(
        req.params.idRecoleccion,
      );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Recolección obtenida correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtener puntos de un recorrido
|--------------------------------------------------------------------------
*/
const getRouteCollectionPointsController = async (req, res, next) => {
  try {
    const data = await getRouteCollectionPointsService(
      req.params.idRecorrido,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: data.length
          ? 'Puntos del recorrido obtenidos correctamente.'
          : 'El recorrido no tiene puntos configurados.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Obtener progreso del recorrido
|--------------------------------------------------------------------------
*/
const getRouteProgressController = async (req, res, next) => {
  try {
    const data = await getRouteProgressService(
      req.params
        .idRecorrido,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Progreso del recorrido obtenido correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Anular recolección
|--------------------------------------------------------------------------
*/
const annulCollectionController = async (req, res, next) => {
  try {
    const metadata = getRequestMetadata(req);

    const data = await annulCollectionService(
      req.params.idRecoleccion,
      req.body,
      metadata,
    );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Recolección anulada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 7. Registrar evidencia
|--------------------------------------------------------------------------
*/
const registerEvidenceController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(
        req,
      );

    const fileData =
      req.file
        ? {
          ...req.file,
          descripcion:
            req.body
              .descripcion,

          fecha_captura:
            req.body
              .fecha_captura,
        }
        : null;

    const data =
      await registerEvidenceService(
        req.params
          .idRecoleccion,

        fileData,

        metadata,
      );

    return res
      .status(201)
      .json({
        success: true,
        message: 'Evidencia registrada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 8. Obtener evidencias
|--------------------------------------------------------------------------
*/
const getCollectionEvidencesController = async (req, res, next) => {
  try {
    const data =
      await getCollectionEvidencesService(
        req.params
          .idRecoleccion,
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          data.length
            ? 'Evidencias obtenidas correctamente.'
            : 'La recolección no tiene evidencias activas.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 9. Anular evidencia
|--------------------------------------------------------------------------
*/
const annulEvidenceController = async (req, res, next) => {
  try {
    const metadata =
      getRequestMetadata(
        req,
      );

    const data =
      await annulEvidenceService(
        req.params
          .idEvidencia,

        req.body,

        metadata,
      );

    return res
      .status(200)
      .json({
        success: true,
        message: 'Evidencia anulada correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 10. Anular evidencia
|--------------------------------------------------------------------------
*/
const getRecorridoCapacidadController = async (req, res, next) => {
  try {
    const data =
      await getRecorridoCapacidadService(
        req.params
          .idRecorrido,
      );

    return res.status(200)
      .json({
        success: true,
        message: 'Capacidad del vehículo obtenida correctamente.',
        data,
      });
  } catch (error) {
    return next(error);
  }
};


module.exports = {
  registerCollectionController,
  registerCollectionBatchController,
  getCollectionByIdController,
  getRouteCollectionPointsController,
  getRouteProgressController,
  annulCollectionController,
  registerEvidenceController,
  getCollectionEvidencesController,
  annulEvidenceController,
  getRecorridoCapacidadController,
};