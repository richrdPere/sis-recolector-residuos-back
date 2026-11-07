const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteIncidenciasService = (
  opciones = {},
) => ejecutar('INCIDENCIAS', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetIncidenciasService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('INCIDENCIAS', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteIncidenciasService,
  obtenerDatasetIncidenciasService,
};