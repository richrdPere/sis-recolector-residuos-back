const ExcelJS = require('exceljs');

const AppError = require('../../../utils/app-error');

// Utils
const {
  validar,
  valorExcel,
  informacion,
  aplanar,
} = require('../utils/exporter.utils');

// =============================================
// EXPORTER: EXCEL
// =============================================
const exportarExcel = async datos => {
  validar(datos, 10000);

  const libro = new ExcelJS.Workbook();

  libro.creator = 'Municipalidad Provincial de Calca';
  libro.created = new Date();

  // *********************************************************
  // ESTILO DE ENCABEZADOS
  // *********************************************************
  const estilizar = hoja => {
    hoja.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    hoja.getRow(1).height = 28;

    hoja.getRow(1).eachCell(celda => {
      celda.font = {
        bold: true,
        color: {
          argb: 'FFFFFFFF',
        },
      };

      celda.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FF175A88',
        },
      };

      celda.alignment = {
        vertical: 'middle',
        wrapText: true,
      };
    });
  };

  // *********************************************************
  // AGREGAR FILA
  // *********************************************************
  const agregar = (hoja, valores) => {
    if (
      valores.some(
        valor =>
          typeof valor === 'string' &&
          valor.length > 32767,
      )
    ) {
      throw new AppError(
        'Una celda supera el límite de Excel. ' +
        'Usa CSV para conservar su contenido.',
        422,
        'REPORT_CELL_TOO_LONG',
      );
    }

    const fila = hoja.addRow(valores);

    fila.eachCell(celda => {
      celda.alignment = {
        vertical: 'top',
        wrapText: true,
      };

      if (typeof celda.value === 'number') {
        celda.numFmt = '#,##0.###############';
      }
    });

    fila.height = Math.min(
      120,
      Math.max(
        18,
        ...valores.map(valor =>
          15 * Math.ceil(
            String(valor ?? '').length / 28,
          ),
        ),
      ),
    );

    return fila;
  };

  // *********************************************************
  // HOJA DE DATOS
  // *********************************************************
  const hoja = libro.addWorksheet('Datos');

  hoja.columns = datos.columnas.map(columna => ({
    header: columna.titulo,
    key: columna.key,

    width: /^fecha/.test(columna.key)
      ? 24
      : /^id_/.test(columna.key)
        ? 18
        : 28,
  }));

  for (const item of datos.items) {
    agregar(
      hoja,
      datos.columnas.map(columna =>
        valorExcel(
          Object.hasOwn(item, columna.key)
            ? item[columna.key]
            : null,

          columna.key,
        ),
      ),
    );
  }

  hoja.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },

    to: {
      row: Math.max(1, hoja.rowCount),
      column: datos.columnas.length,
    },
  };

  estilizar(hoja);

  // *********************************************************
  // INFORMACIÓN Y RESUMEN
  // *********************************************************
  for (
    const [nombre, filas] of [
      ['Información', informacion(datos)],
      ['Resumen', aplanar(datos.resumen || {})],
    ]
  ) {
    const extra = libro.addWorksheet(nombre);

    extra.columns = [
      {
        header: 'Concepto',
        width: 48,
      },
      {
        header: 'Valor',
        width: 80,
      },
    ];

    for (const fila of filas) {
      agregar(extra, fila);
    }

    estilizar(extra);
  }

  return Buffer.from(
    await libro.xlsx.writeBuffer(),
  );
};

module.exports = {
  exportarExcel,
};