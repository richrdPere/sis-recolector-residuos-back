// controllers/index.js

const {
    createCitizenProfileController,
    getMyCitizenProfileController,
    updateCitizenProfileController,
} = require('./ciudadano.controller');

const {
    getMyAddressesController,
    createCitizenAddressController,
    updateCitizenAddressController,
    setPrimaryAddressController,
    deleteCitizenAddressController,
    getScheduleByAddressController,
} = require('./domicilio.controller');

const {
    getNotificationPreferencesController,
    updateNotificationPreferencesController,
} = require('./preferencia.controller');

module.exports = {
    createCitizenProfileController,
    getMyCitizenProfileController,
    updateCitizenProfileController,

    getMyAddressesController,
    createCitizenAddressController,
    updateCitizenAddressController,
    setPrimaryAddressController,
    deleteCitizenAddressController,
    getScheduleByAddressController,

    getNotificationPreferencesController,
    updateNotificationPreferencesController,
};