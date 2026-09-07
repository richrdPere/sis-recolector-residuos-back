const {
  createQrCodeService,
  getQrCodesService,
  getQrCodeByIdService,
  changeQrCodeStatusService,
  regenerateQrCodeService,
  generateQrImageService,
} = require('../services');

const {
  getAuthenticatedUserId,
} = require('../utils/codigo-qr-controller.utils');

/*
|--------------------------------------------------------------------------
| 1. Crear código QR
|--------------------------------------------------------------------------
*/
const createQrCodeController = async (req, res, next) => {
  try {
    const idUsuario =
      getAuthenticatedUserId(
        req,
      );

    const data =
      await createQrCodeService({
        ...req.body,

        id_usuario_creacion:
          idUsuario,
      });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Código QR creado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 2. Listar códigos QR
|--------------------------------------------------------------------------
*/
const getQrCodesController = async (req, res, next) => {
  try {
    const data =
      await getQrCodesService({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        tipo_recurso: req.query.tipo_recurso,
        id_zona: req.query.id_zona,
        id_ruta: req.query.id_ruta,
        estado_qr: req.query.estado_qr,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Códigos QR obtenidos correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 3. Obtener código QR por ID
|--------------------------------------------------------------------------
*/
const getQrCodeByIdController = async (req, res, next) => {
  try {
    const data =
      await getQrCodeByIdService(req.params.idCodigoQr);

    return res
      .status(200)
      .json({
        success: true,
        message: 'Código QR obtenido correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 4. Cambiar estado
|--------------------------------------------------------------------------
*/
const changeQrCodeStatusController = async (req, res, next) => {
  try {
    const data =
      await changeQrCodeStatusService({
        id_codigo_qr: req.params.idCodigoQr,
        estado_qr: req.body.estado_qr,
        motivo: req.body.motivo || null,
      });

    return res
      .status(200)
      .json({
        success: true,
        message: 'Estado del código QR actualizado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 5. Regenerar código QR
|--------------------------------------------------------------------------
*/
const regenerateQrCodeController = async (req, res, next) => {
  try {
    const idUsuario = getAuthenticatedUserId(req);

    const data = await regenerateQrCodeService({
      id_codigo_qr: req.params.idCodigoQr,
      id_usuario_creacion: idUsuario,
      motivo: req.body.motivo,
    });

    return res
      .status(201)
      .json({
        success: true,
        message: 'Código QR regenerado correctamente.',
        data,
      });
  } catch (error) {
    next(error);
  }
};
/*
|--------------------------------------------------------------------------
| 6. Generar imagen QR
|--------------------------------------------------------------------------
|
| Retorna directamente PNG o SVG.
|
*/
const generateQrImageController = async (req, res, next) => {
  try {
    const data = await generateQrImageService({
      id_codigo_qr: req.params.idCodigoQr,
      formato: req.query.formato || 'PNG',
      width: req.query.width || 512,
      margin: req.query.margin || 4,
    });

    const download = String(req.query.download || '').toLowerCase() === 'true' || req.query.download === '1';

    res.setHeader(
      'Content-Type',
      data.content_type,
    );

    res.setHeader(
      'Content-Disposition',
      `${download
        ? 'attachment'
        : 'inline'
      }; filename="${data.file_name}"`,
    );

    res.setHeader(
      'Cache-Control',
      'private, max-age=3600',
    );

    if (
      Buffer.isBuffer(
        data.content,
      )
    ) {
      res.setHeader(
        'Content-Length',
        data.content.length,
      );
    } else {
      res.setHeader(
        'Content-Length',
        Buffer.byteLength(
          data.content,
          'utf8',
        ),
      );
    }

    return res
      .status(200)
      .send(
        data.content,
      );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQrCodeController,
  getQrCodesController,
  getQrCodeByIdController,
  changeQrCodeStatusController,
  regenerateQrCodeController,
  generateQrImageController,
};