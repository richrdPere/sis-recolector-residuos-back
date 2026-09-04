// services/index.js

const createNotificationService = require('./create-notification.service');
const getMyNotificationsService = require('./get-my-notifications.service');
const getMyNotificationByIdService = require('./get-my-notification-by-id.service');
const getUnreadCountService = require('./get-unread-count.service');
const markNotificationReadService = require('./mark-notification-read.service');
const markAllNotificationsReadService = require('./mark-all-notifications-read.service');
const archiveNotificationService = require('./archive-notification.service');

module.exports = {
    // Notificaciones internas

    createNotificationService,
    getMyNotificationsService,
    getMyNotificationByIdService,
    getUnreadCountService,
    markNotificationReadService,
    markAllNotificationsReadService,
    archiveNotificationService,
};