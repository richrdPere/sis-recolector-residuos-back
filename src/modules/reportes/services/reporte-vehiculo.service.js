const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteVehiculosService = (
  opciones = {},
) => ejecutar('VEHICULOS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetVehiculosService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('VEHICULOS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteVehiculosService,
  obtenerDatasetVehiculosService,
};