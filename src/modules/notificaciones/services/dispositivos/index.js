const registerDeviceService = require('./register-device.service');
const getMyDevicesService = require('./get-my-devices.service');
const deactivateDeviceService = require('./deactivate-device.service');
const deactivateDeviceByTokenService = require('./deactivate-device-by-token.service');
const revokeInvalidTokenService = require('./revoke-invalid-token.service');

module.exports = {
    // Dispositivos y tokens FCM

    registerDeviceService,
    getMyDevicesService,
    deactivateDeviceService,
    deactivateDeviceByTokenService,
    revokeInvalidTokenService,
};