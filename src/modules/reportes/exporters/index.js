const AppError = require('../../../utils/app-error');

const {
  exportarCsv,
} = require('./csv-exporter');

const {
  exportarExcel,
} = require('./excel-exporter');

const {
  exportarPdf,
} = require('./pdf-exporter');

const exportadores = Object.freeze({
  csv: exportarCsv,
  xlsx: exportarExcel,
  pdf: exportarPdf,
});

const obtenerExportador = formato => {
  if (!Object.hasOwn(exportadores, formato)) {
    throw new AppError(
      'Formato no válido.',
      400,
      'INVALID_REPORT_FORMAT',
    );
  }

  const exportador = exportadores[formato];

  if (typeof exportador !== 'function') {
    throw new AppError(
      `El exportador ${formato} todavía no está implementado.`,
      501,
      'REPORT_RENDERER_NOT_CONFIGURED',
    );
  }

  return exportador;
};

module.exports = {
  obtenerExportador,
};