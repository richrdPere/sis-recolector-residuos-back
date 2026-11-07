const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteMantenimientosService = (
  opciones = {},
) => ejecutar('MANTENIMIENTOS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetMantenimientosService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('MANTENIMIENTOS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteMantenimientosService,
  obtenerDatasetMantenimientosService,
};