const {
  ejecutar,
} = require('./reporte-base.service');

const AppError = require('../../../utils/app-error');

const obtenerReporteRecoleccionesService = (
  opciones = {},
) => ejecutar('RECOLECCIONES', {
  ...opciones,
  formato: null,
  soloResumen: false,
});

const obtenerDatasetRecoleccionesService = (
  opciones = {},
) => {
  if (!opciones.formato) {
    throw new AppError(
      'Indica el formato del dataset: pdf, xlsx o csv.',
      400,
      'REPORT_FORMAT_REQUIRED',
    );
  }

  return ejecutar('RECOLECCIONES', {
    ...opciones,
    soloResumen: false,
  });
};

module.exports = {
  obtenerReporteRecoleccionesService,
  obtenerDatasetRecoleccionesService,
};