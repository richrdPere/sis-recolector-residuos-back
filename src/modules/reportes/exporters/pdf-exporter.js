const PDFDocument = require('pdfkit');

const AppError = require('../../../utils/app-error');

// Utils
const {
  validar,
  texto,
  informacion,
  aplanar,
  titulos,
} = require('../utils/exporter.utils');

// =============================================
// EXPORTER: pdf
// =============================================
const exportarPdf = async datos => {
  validar(datos, 1000);

  const filas = datos.items.map(item =>
    datos.columnas.map(columna =>
      texto(
        Object.hasOwn(item, columna.key)
          ? item[columna.key]
          : null,

        columna.key,
      ),
    ),
  );

  const caracteres = filas.reduce(
    (total, fila) =>
      total + fila.join('').length,
    0,
  );

  if (caracteres > 8000000) {
    throw new AppError(
      'El contenido del PDF es demasiado extenso. ' +
      'Reduce los filtros.',
      422,
      'REPORT_FILE_LIMIT',
    );
  }

  const doc = new PDFDocument({
    size: 'A4',

    layout:
      datos.columnas.length <= 8
        ? 'landscape'
        : 'portrait',

    margins: {
      top: 82,
      bottom: 45,
      left: 35,
      right: 35,
    },

    bufferPages: true,

    info: {
      Title:
        titulos[datos.tipo_reporte] ||
        'Reporte operativo',

      Author:
        'Municipalidad Provincial de Calca',
    },
  });

  // *********************************************************
  // RECIBIR EL PDF COMO BUFFER
  // *********************************************************
  const terminado = new Promise(
    (resolve, reject) => {
      const partes = [];
      let bytes = 0;

      doc.on('data', parte => {
        bytes += parte.length;

        if (bytes > 50 * 1024 * 1024) {
          doc.destroy(
            new AppError(
              'El PDF supera los 50 MB.',
              422,
              'REPORT_FILE_LIMIT',
            ),
          );

          return;
        }

        partes.push(parte);
      });

      doc.on('end', () => {
        resolve(Buffer.concat(partes));
      });

      doc.on('error', reject);
    },
  );

  try {
    const izquierda = 35;
    const ancho = doc.page.width - 70;

    const limite = () =>
      doc.page.height - 55;

    const asegurar = alto => {
      if (doc.y + alto > limite()) {
        doc.addPage();
      }
    };

    // *********************************************************
    // INFORMACIÓN GENERAL
    // *********************************************************
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#263746');

    for (
      const [key, value] of informacion(datos)
    ) {
      doc.text(
        `${key}: ${value}`,
        {
          width: ancho,
          paragraphGap: 3,
        },
      );
    }

    doc.moveDown(0.7);

    // *********************************************************
    // MEDIDAS PARA TABLA
    // *********************************************************
    const celda =
      ancho / datos.columnas.length;

    const altoCabecera = () => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8);

      return Math.max(
        30,
        ...datos.columnas.map(columna =>
          doc.heightOfString(
            columna.titulo,
            {
              width: celda - 10,
            },
          ) + 12,
        ),
      );
    };

    const altoFila = fila => {
      doc
        .font('Helvetica')
        .fontSize(8);

      return Math.max(
        24,
        ...fila.map(valor =>
          doc.heightOfString(
            valor || '-',
            {
              width: celda - 10,
            },
          ) + 12,
        ),
      );
    };

    const tabla =
      datos.columnas.length <= 8 &&
      filas.every(fila =>
        altoFila(fila) <=
        doc.page.height -
        82 -
        55 -
        altoCabecera(),
      );

    // *********************************************************
    // SIN RESULTADOS
    // *********************************************************
    if (!filas.length) {
      asegurar(30);

      doc
        .font('Helvetica')
        .fontSize(11)
        .text(
          'Sin registros para los filtros seleccionados.',
        );
    } else if (tabla) {
      // *******************************************************
      // TABLA
      // *******************************************************
      const cabecera = (reserva = 24) => {
        const alto = altoCabecera();

        asegurar(alto + reserva);

        const y = doc.y;

        doc
          .rect(
            izquierda,
            y,
            ancho,
            alto,
          )
          .fill('#175A88');

        datos.columnas.forEach(
          (columna, indice) => {
            doc
              .font('Helvetica-Bold')
              .fontSize(8)
              .fillColor('white')
              .text(
                columna.titulo,
                izquierda + indice * celda + 5,
                y + 6,
                {
                  width: celda - 10,
                  height: alto - 10,
                },
              );
          },
        );

        doc.x = izquierda;
        doc.y = y + alto;
      };

      cabecera(altoFila(filas[0]));

      filas.forEach((fila, indice) => {
        const alto = altoFila(fila);

        if (doc.y + alto > limite()) {
          doc.addPage();
          cabecera(alto);
        }

        const y = doc.y;

        doc
          .rect(
            izquierda,
            y,
            ancho,
            alto,
          )
          .fill(
            indice % 2
              ? '#F0F5FA'
              : '#FFFFFF',
          );

        fila.forEach((valor, columna) => {
          doc
            .rect(
              izquierda + columna * celda,
              y,
              celda,
              alto,
            )
            .lineWidth(0.3)
            .stroke('#CED8E0');

          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#263746')
            .text(
              valor || '-',
              izquierda + columna * celda + 5,
              y + 6,
              {
                width: celda - 10,
                height: alto - 10,
              },
            );
        });

        doc.x = izquierda;
        doc.y = y + alto;
      });
    } else {
      // *******************************************************
      // FICHAS PARA MUCHOS CAMPOS O TEXTOS EXTENSOS
      // *******************************************************
      filas.forEach((fila, indice) => {
        asegurar(42);

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#175A88')
          .text(
            `Registro ${indice + 1}`,
            izquierda,
            doc.y,
            {
              width: ancho,
            },
          );

        doc.moveDown(0.3);

        fila.forEach((valor, columna) => {
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#263746')
            .text(
              `${datos.columnas[columna].titulo}: ` +
              `${valor || 'Sin dato'}`,
              {
                width: ancho,
                paragraphGap: 4,
              },
            );
        });

        doc.moveDown(0.7);
      });
    }

    // *********************************************************
    // RESUMEN
    // *********************************************************
    const resumen = aplanar(
      datos.resumen || {},
    );

    if (resumen.length) {
      asegurar(65);

      doc.x = izquierda;
      doc.moveDown();

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#175A88')
        .text('Resumen del período');

      doc.moveDown(0.4);

      for (const [key, value] of resumen) {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#263746')
          .text(
            `${key}: ${value}`,
            {
              width: ancho,
              paragraphGap: 3,
            },
          );
      }
    }

    // *********************************************************
    // ENCABEZADO Y NUMERACIÓN DE TODAS LAS PÁGINAS
    // *********************************************************
    const paginas = doc.bufferedPageRange();

    for (
      let indice = paginas.start;
      indice < paginas.start + paginas.count;
      indice++
    ) {
      doc.switchToPage(indice);

      // Permite escribir el pie sin generar una página nueva.
      const margenInferior =
        doc.page.margins.bottom;

      doc.page.margins.bottom = 0;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#175A88')
        .text(
          'Municipalidad Provincial de Calca',
          izquierda,
          24,
          {
            width: ancho,
            lineBreak: false,
          },
        );

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#263746')
        .text(
          titulos[datos.tipo_reporte] ||
          'Reporte operativo',
          izquierda,
          44,
          {
            width: ancho,
            lineBreak: false,
          },
        );

      doc
        .fontSize(8)
        .fillColor('#607080')
        .text(
          `Página ${indice - paginas.start + 1} ` +
          `de ${paginas.count} | America/Lima (UTC-5)`,
          izquierda,
          doc.page.height - 29,
          {
            width: ancho,
            align: 'right',
            lineBreak: false,
          },
        );

      doc.page.margins.bottom =
        margenInferior;
    }

    doc.end();
  } catch (error) {
    doc.destroy(error);
  }

  return terminado;
};

module.exports = {
  exportarPdf,
};