const AppError = require('../../../utils/app-error');

// Services
const {
  resolvePublicQrService,
  getPublicScheduleService,
  getPublicRouteStatusService,
  getPublicRouteLocationService,
  getPublicQrInformationService,
} = require('../services');

// Utils
const { getPublicRequestMetadata } = require('../utils/codigo-qr-controller.utils');

// Responder QR no disponible

const respondUnavailableQr = (res, qrResult,) => {
  if (!qrResult.encontrado) {
    return res
      .status(404)
      .json({
        success: false,

        message:
          qrResult.mensaje ||
          'El código QR no fue encontrado.',

        data:
          qrResult,
      });
  }

  /*
   * Un QR inactivo, revocado o expirado se responde con 200 para
   * que Angular pueda mostrar una pantalla informativa.
   */

  return res
    .status(200)
    .json({
      success: false,
      message: qrResult.mensaje || 'El código QR no está disponible.',
      data: qrResult,
    });
};

/*
|--------------------------------------------------------------------------
| Resolver y validar código QR
|--------------------------------------------------------------------------
|
| Esta función solamente se utiliza internamente por los controllers.
|
*/
const resolveAvailableQr = async (req,) => {
  const metadata = getPublicRequestMetadata(req,);

  return resolvePublicQrService({
    token_publico: req.params.tokenPublico,
    ...metadata,
  });
};

/*
|--------------------------------------------------------------------------
| 1. Resolver código QR público
|--------------------------------------------------------------------------
*/
const resolvePublicQrController = async (req, res, next) => {
  try {
    const data = await resolveAvailableQr(req);

    if (!data.encontrado || !data.disponible) {
      return respondUnavailableQr(
        res,
        data,
      );
    }

    return res
      .status(200)
      .json({
        success: true,
        message: 'Código QR resuelto correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Obtener información pública completa
|--------------------------------------------------------------------------
|
| Incluye:
|
| - Zona o ruta.
| - Cronograma.
| - Próxima recolección.
| - Estado.
| - Ubicación aproximada.
|
*/
const getPublicQrInformationController = async (req, res, next) => {
  try {
    const metadata = getPublicRequestMetadata(req);

    const data = await getPublicQrInformationService({
      token_publico: req.params.tokenPublico,
      fecha_referencia: req.query.fecha_referencia || null,
      ...metadata,
    });

    /*
     * Cuando el QR no existe o no está disponible, el service retorna
     * el resultado de resolución dentro de codigo_qr.
     */

    if (data.codigo_qr && data.codigo_qr.encontrado === false) {
      return res
        .status(404)
        .json({
          success: false,
          message: data.codigo_qr.mensaje || 'El código QR no fue encontrado.',
          data,
        });
    }

    if (
      data.codigo_qr &&
      data.codigo_qr
        .disponible ===
      false
    ) {
      return res
        .status(200)
        .json({
          success: false,

          message:
            data.codigo_qr
              .mensaje ||
            'El código QR no está disponible.',

          data,
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Información pública obtenida correctamente.',

        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener cronograma público mediante QR
|--------------------------------------------------------------------------
|
| Este endpoint acepta QR de ZONA y QR de RUTA.
|
*/
const getPublicQrScheduleController = async (req, res, next) => {
  try {
    const qrResult =
      await resolveAvailableQr(
        req,
      );

    if (
      !qrResult.encontrado ||
      !qrResult.disponible
    ) {
      return respondUnavailableQr(
        res,
        qrResult,
      );
    }

    const resource =
      qrResult.recurso;

    const data =
      await getPublicScheduleService({
        id_zona:
          resource.tipo ===
            'ZONA'
            ? resource.id
            : null,

        id_ruta:
          resource.tipo ===
            'RUTA'
            ? resource.id
            : null,

        fecha_referencia:
          req.query
            .fecha_referencia ||
          null,
      });

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Cronograma público obtenido correctamente.',

        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Obtener estado público mediante QR
|--------------------------------------------------------------------------
|
| Este endpoint requiere que el código QR pertenezca directamente
| a una ruta.
|
*/
const getPublicQrRouteStatusController = async (req, res, next) => {
  try {
    const qrResult =
      await resolveAvailableQr(
        req,
      );

    if (
      !qrResult.encontrado ||
      !qrResult.disponible
    ) {
      return respondUnavailableQr(
        res,
        qrResult,
      );
    }

    if (
      qrResult.recurso
        .tipo !== 'RUTA'
    ) {
      throw new AppError(
        'El código QR pertenece a una zona. Utilice el endpoint de información completa para consultar sus rutas.',
        409,
        'QR_RESOURCE_IS_NOT_ROUTE',
      );
    }

    const data =
      await getPublicRouteStatusService({
        id_ruta:
          qrResult
            .recurso.id,

        fecha_referencia:
          req.query
            .fecha_referencia ||
          null,
      });

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Estado público de la ruta obtenido correctamente.',

        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Obtener ubicación aproximada mediante QR
|--------------------------------------------------------------------------
|
| Este endpoint requiere un código QR directamente asociado con una ruta.
|
*/
const getPublicQrRouteLocationController = async (req, res, next) => {
  try {
    const qrResult =
      await resolveAvailableQr(
        req,
      );

    if (
      !qrResult.encontrado ||
      !qrResult.disponible
    ) {
      return respondUnavailableQr(
        res,
        qrResult,
      );
    }

    if (
      qrResult.recurso
        .tipo !== 'RUTA'
    ) {
      throw new AppError(
        'El código QR pertenece a una zona. Utilice el endpoint de información completa para consultar sus rutas.',
        409,
        'QR_RESOURCE_IS_NOT_ROUTE',
      );
    }

    const data =
      await getPublicRouteLocationService({
        id_ruta:
          qrResult
            .recurso.id,
      });

    return res
      .status(200)
      .json({
        success: true,
        message:
          data.disponible
            ? 'Ubicación pública obtenida correctamente.'
            : data.mensaje,
        data,
      });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resolvePublicQrController,
  getPublicQrInformationController,
  getPublicQrScheduleController,
  getPublicQrRouteStatusController,
  getPublicQrRouteLocationController,
};