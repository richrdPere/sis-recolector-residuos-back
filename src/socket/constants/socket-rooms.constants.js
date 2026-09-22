const { id } = require('../utils/errors');

module.exports = Object.freeze({
  usuario: (value) => `usuario:${id(value)}`,
  recorrido: (value) => `recorrido:${id(value)}`,
  monitoreo: 'monitoreo:operativo',

  // Cada QR tiene su sala: revocarlo no afecta otros QR del mismo recurso.
  publicoQr: (value) => `publico:qr:${id(value)}`,
});
