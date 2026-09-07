// controllers/index.js

const {
    createQrCodeController,
    getQrCodesController,
    getQrCodeByIdController,
    changeQrCodeStatusController,
    regenerateQrCodeController,
    generateQrImageController,
} = require('./codigo-qr.controller');

const {
    resolvePublicQrController,
    getPublicQrInformationController,
    getPublicQrScheduleController,
    getPublicQrRouteStatusController,
    getPublicQrRouteLocationController,
} = require('./codigo-qr-public.controller');

module.exports = {
    createQrCodeController,
    getQrCodesController,
    getQrCodeByIdController,
    changeQrCodeStatusController,
    regenerateQrCodeController,
    generateQrImageController,

    resolvePublicQrController,
    getPublicQrInformationController,
    getPublicQrScheduleController,
    getPublicQrRouteStatusController,
    getPublicQrRouteLocationController,
};