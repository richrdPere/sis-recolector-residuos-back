const {
  Transaction,
} = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  ejecutar,
  autorizar,
  construir,
} = require('./reporte-base.service');

const validarFiltrosResumen = query => {
  if (
    !query ||
    typeof query !== 'object' ||
    Array.isArray(query)
  ) {
    throw new AppError(
      'Filtros no válidos.',
      400,
      'INVALID_SUMMARY_FILTER',
    );
  }

  const permitidos = [
    'fecha_inicio',
    'fecha_fin',
    'id_zona',
    'id_ruta',
    'id_vehiculo',
    'turno',
  ];

  if (
    Object.keys(query).some(
      campo => !permitidos.includes(campo),
    )
  ) {
    throw new AppError(
      'El resumen admite fechas, zona, ruta, vehículo y turno.',
      400,
      'INVALID_SUMMARY_FILTER',
    );
  }

  return construir(
    'PROGRAMACIONES',
    query,
  ).filtros;
};

const obtenerReporteResumenService = async ({
  query = {},
  usuario,
  transaction = null,
} = {}) => {
  const generado_por = autorizar(usuario);

  const filtros_aplicados = validarFiltrosResumen(query);

  const leer = async tx => {
    const salida = {};

    for (
      const tipo of [
        'PROGRAMACIONES',
        'RECORRIDOS',
        'ATENCION_PUNTOS',
        'RECOLECCIONES',
        'INCIDENCIAS',
      ]
    ) {
      salida[tipo.toLowerCase()] =
        await ejecutar(tipo, {
          query,
          usuario,
          transaction: tx,
          soloResumen: true,
        });
    }

    return {
      tipo_reporte: 'RESUMEN_OPERATIVO',
      filtros_aplicados,
      resumen: salida,

      metadata: {
        zona_horaria: 'America/Lima',
        generado_por,
        generado_en: new Date().toISOString(),

        nota:
          'Programaciones por fecha programada; ' +
          'recorridos por inicio; residuos por cierre; ' +
          'incidencias por reporte.',
      },
    };
  };

  return transaction
    ? leer(transaction)
    : db.sequelize.transaction(
      {
        isolationLevel:
          Transaction.ISOLATION_LEVELS
            .REPEATABLE_READ,
      },
      leer,
    );
};

module.exports = {
  obtenerReporteResumenService,
  validarFiltrosResumen,
};