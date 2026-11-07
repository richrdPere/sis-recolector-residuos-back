const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteAtencionService = (
  opciones = {},
) => ejecutar('ATENCION_PUNTOS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetAtencionService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('ATENCION_PUNTOS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteAtencionService,
  obtenerDatasetAtencionService,
};