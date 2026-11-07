const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteRecorridosService = (
  opciones = {},
) => ejecutar('RECORRIDOS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetRecorridosService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('RECORRIDOS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteRecorridosService,
  obtenerDatasetRecorridosService,
};