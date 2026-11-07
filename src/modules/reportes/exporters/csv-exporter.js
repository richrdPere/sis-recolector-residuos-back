const AppError = require('../../../utils/app-error');

// Utils
const {
  validar,
  texto,
  esNumero,
} = require('../utils/exporter.utils');

// =============================================
// EXPORTER: CSV
// =============================================
const exportarCsv = async datos => {
  validar(datos, 50000);

  const escapar = (valor, key = '') => {
    let str = texto(valor, key);

    // Evitar que un texto se interprete como fórmula
    // al abrir el CSV en una hoja de cálculo.
    if (
      /^[\s\u0000-\u001f]*[=+\-@]/.test(str) &&
      !esNumero(valor, key)
    ) {
      str = `'${str}`;
    }

    return `"${str.replace(/"/g, '""')}"`;
  };

  const lineas = [
    datos.columnas
      .map(columna => escapar(columna.titulo))
      .join(','),
  ];

  let bytes =
    3 +
    Buffer.byteLength(
      lineas[0] + '\r\n',
      'utf8',
    );

  for (const fila of datos.items) {
    const linea = datos.columnas
      .map(columna => escapar(
        Object.hasOwn(fila, columna.key)
          ? fila[columna.key]
          : null,

        columna.key,
      ))
      .join(',');

    bytes += Buffer.byteLength(
      linea + '\r\n',
      'utf8',
    );

    if (bytes > 50 * 1024 * 1024) {
      throw new AppError(
        'El CSV supera los 50 MB. Reduce el período.',
        422,
        'REPORT_FILE_LIMIT',
      );
    }

    lineas.push(linea);
  }

  return Buffer.from(
    '\uFEFF' + lineas.join('\r\n') + '\r\n',
    'utf8',
  );
};

module.exports = {
  exportarCsv,
};