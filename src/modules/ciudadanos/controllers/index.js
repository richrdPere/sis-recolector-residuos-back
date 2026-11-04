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
    getActiveServiceByAddressController,
} = require('./domicilio.controller');

const {
    getNotificationPreferencesController,
    updateNotificationPreferencesController,
} = require('./preferencia.controller');

const {
    resolverCoberturaController,
} = require('./cobertura.controller');

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
    getActiveServiceByAddressController,

    getNotificationPreferencesController,
    updateNotificationPreferencesController,

    resolverCoberturaController
};