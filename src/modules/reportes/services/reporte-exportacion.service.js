const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  ejecutar,
  autorizar,
  construir,
  LIMITES,
} = require('./reporte-base.service');

const {
  obtenerReporteResumenService,
  validarFiltrosResumen,
} = require('./reporte-resumen.service');

/*
Contrato del exportador:

async function renderizar({
  formato,
  columnas,
  items,
  metadata,
  filtros_aplicados,
  resumen,
}) {
  return Buffer;
}

La función debe proceder del servidor.
Nunca debe recibirse desde req.body.
*/

const generarExportacionReporteService = async ({
  tipo_reporte,
  formato,
  query = {},
  usuario,
  columnas = null,
  renderizar,
  ip = null,
  user_agent = null,
} = {}) => {
  const id_usuario = autorizar(usuario);

  if (!Object.hasOwn(LIMITES, formato)) {
    throw new AppError(
      'Formato no válido.',
      400,
      'INVALID_REPORT_FORMAT',
    );
  }

  if (typeof renderizar !== 'function') {
    throw new AppError(
      'No está configurado el exportador solicitado.',
      501,
      'REPORT_RENDERER_NOT_CONFIGURED',
    );
  }

  if (
    columnas !== null &&
    (
      !Array.isArray(columnas) ||
      columnas.length === 0 ||
      columnas.some(
        columna => typeof columna !== 'string',
      ) ||
      new Set(columnas).size !== columnas.length
    )
  ) {
    throw new AppError(
      'La selección de columnas no es válida.',
      400,
      'INVALID_REPORT_COLUMNS',
    );
  }

  const filtros =
    tipo_reporte === 'RESUMEN_OPERATIVO'
      ? validarFiltrosResumen(query)
      : construir(tipo_reporte, query).filtros;

  const registro = await db.ReporteExportacion.create({
    id_usuario,
    tipo_reporte,
    formato,
    filtros,
    columnas,

    estado: 'GENERANDO',
    fecha_inicio_proceso: new Date(),

    ip,

    user_agent:
      typeof user_agent === 'string'
        ? user_agent.slice(0, 500)
        : null,
  });

  try {
    let dataset;

    if (tipo_reporte === 'RESUMEN_OPERATIVO') {
      const resumen =
        await obtenerReporteResumenService({
          query,
          usuario,
        });

      const items = [];

      for (
        const [tipo, datos] of
        Object.entries(resumen.resumen)
      ) {
        items.push({
          indicador: `${tipo}: total`,
          valor: datos.total,
          unidad: 'registros',
        });

        for (const estado of datos.por_estado) {
          items.push({
            indicador: `${tipo}: ${estado.estado}`,
            valor: estado.total,
            unidad: 'registros',
          });
        }

        for (
          const cantidad of
          datos.cantidades_por_unidad || []
        ) {
          items.push({
            indicador: 'residuos recolectados',
            valor: cantidad.cantidad_total,
            unidad: cantidad.unidad_medida,
          });
        }

        if (
          datos.resultados_pendientes !== undefined
        ) {
          items.push({
            indicador:
              'residuos: resultados pendientes',

            valor: datos.resultados_pendientes,
            unidad: 'recorridos',
          });
        }
      }

      dataset = {
        ...resumen,
        items,

        columnas: [
          'indicador',
          'valor',
          'unidad',
        ].map(key => ({
          key,
          titulo: key,
        })),
      };
    } else {
      dataset = await ejecutar(
        tipo_reporte,
        {
          query,
          usuario,
          formato,
        },
      );
    }

    if (columnas) {
      const permitidas = new Map(
        dataset.columnas.map(
          columna => [columna.key, columna],
        ),
      );

      if (
        columnas.some(
          columna => !permitidas.has(columna),
        )
      ) {
        throw new AppError(
          'El reporte no admite alguna de las columnas solicitadas.',
          400,
          'INVALID_REPORT_COLUMNS',
        );
      }

      dataset.columnas = columnas.map(
        columna => permitidas.get(columna),
      );

      dataset.items = dataset.items.map(
        fila => Object.fromEntries(
          columnas.map(
            columna => [columna, fila[columna]],
          ),
        ),
      );
    }

    const buffer = await renderizar({
      formato,
      ...dataset,
    });

    if (
      !Buffer.isBuffer(buffer) ||
      buffer.length === 0 ||
      buffer.length > 50 * 1024 * 1024
    ) {
      throw new AppError(
        'El exportador devolvió un archivo vacío, inválido o mayor de 50 MB.',
        422,
        'INVALID_REPORT_FILE',
      );
    }

    const nombre_archivo =
      `${tipo_reporte.toLowerCase()}_` +
      `${query.fecha_inicio}_` +
      `${query.fecha_fin}_` +
      `${registro.id_reporte_exportacion}.` +
      formato;

    const mime_type = {
      pdf: 'application/pdf',

      xlsx:
        'application/vnd.openxmlformats-officedocument.' +
        'spreadsheetml.sheet',

      csv: 'text/csv; charset=utf-8',
    }[formato];

    await registro.update({
      columnas: dataset.columnas.map(
        columna => columna.key,
      ),
    });

    await registro.marcarCompletado({
      nombre_archivo,
      mime_type,
      total_registros: dataset.items.length,
      tamano_bytes: buffer.length,
    });

    return {
      id_reporte_exportacion:
        registro.id_reporte_exportacion,

      nombre_archivo,
      mime_type,
      buffer,
      total_registros: dataset.items.length,
    };
  } catch (error) {
    try {
      await registro.marcarError({
        mensaje_error:
          'No se pudo generar el reporte.',

        codigo_error:
          typeof error.code === 'string'
            ? error.code.slice(0, 100)
            : 'REPORT_EXPORT_FAILED',
      });
    } catch (falloRegistro) {
      console.error(
        '[reportes:estado-exportacion]',
        falloRegistro.name,
      );
    }

    throw error;
  }
};

module.exports = {
  generarExportacionReporteService,
};