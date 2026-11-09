'use strict';

const RESULTADOS_ATENCION = Object.freeze([
  'ATENDIDO',
  'OMITIDO',
]);

const MOTIVOS_OMISION = Object.freeze([
  'ACCESO_BLOQUEADO',
  'PUNTO_INACCESIBLE',
  'RIESGO_SEGURIDAD',
  'AVERIA_VEHICULO',
  'OTRO',
]);

// Para atender, la precisión máxima será:
// Math.min(50, radio_atencion_metros).
const PRECISION_MAXIMA_ATENCION_METROS = 50;

module.exports = {
  RESULTADOS_ATENCION,
  MOTIVOS_OMISION,
  PRECISION_MAXIMA_ATENCION_METROS,
};