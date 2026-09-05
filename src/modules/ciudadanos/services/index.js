// services/index.js

const createCitizenProfileService = require('./create-citizen-profile.service');
const getMyCitizenProfileService = require('./get-my-citizen-profile.service');
const updateCitizenProfileService = require('./update-citizen-profile.service');
const getMyAddressesService = require('./get-my-addresses.service');
const createCitizenAddressService = require('./create-citizen-address.service');
const updateCitizenAddressService = require('./update-citizen-address.service');
const setPrimaryAddressService = require('./set-primary-address.service');
const deleteCitizenAddressService = require('./delete-citizen-address.service');
const getNotificationPreferencesService = require('./get-notification-preferences.service');
const updateNotificationPreferencesService = require('./update-notification-preferences.service');
const getScheduleByAddressService = require('./get-schedule-by-address.service');

module.exports = {
    createCitizenProfileService,
    getMyCitizenProfileService,
    updateCitizenProfileService,
    getMyAddressesService,
    createCitizenAddressService,
    updateCitizenAddressService,
    setPrimaryAddressService,
    deleteCitizenAddressService,
    getNotificationPreferencesService,
    updateNotificationPreferencesService,
    getScheduleByAddressService,
};