const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteCiudadanosService = (
  opciones = {},
) => ejecutar('REPORTES_CIUDADANOS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetCiudadanosService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('REPORTES_CIUDADANOS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteCiudadanosService,
  obtenerDatasetCiudadanosService,
};