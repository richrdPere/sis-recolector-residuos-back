module.exports = Object.freeze({
  TRACKING_SEND: 'tracking:ubicacion:enviar',
  TRACKING_UPDATED: 'tracking:ubicacion:actualizada',

  ROUTE_JOIN: 'recorrido:suscribir',
  ROUTE_LEAVE: 'recorrido:desuscribir',

  ROUTE_UPDATED: 'recorrido:estado:actualizado',

  MONITOR_JOIN: 'monitoreo:suscribir',
  MONITOR_LEAVE: 'monitoreo:desuscribir',

  PUBLIC_JOIN: 'sector:suscribir',
  PUBLIC_LEAVE: 'sector:desuscribir',

  PUBLIC_SNAPSHOT: 'publico:actualizado',
  PROGRAM_UPDATED: 'programacion:actualizada',

  NOTIFICATION_NEW: 'notificacion:nueva',
  NOTIFICATION_READ: 'notificacion:leida',

  ERROR: 'socket:error',
  AUTH_ERROR: 'auth:error',
  ROOM_REVOKED: 'sala:revocada',
});
