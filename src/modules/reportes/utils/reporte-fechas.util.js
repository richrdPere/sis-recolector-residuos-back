const { RANGO_FECHAS_REPORTE } = require('../constants/reporte.constants');

/*
|--------------------------------------------------------------------------
| Verificar formato YYYY-MM-DD
|--------------------------------------------------------------------------
*/

const esFechaISO = (valor) => {
  if (
    typeof valor !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false;
  }

  const fecha = new Date(`${valor}T00:00:00.000Z`);

  if (Number.isNaN(fecha.getTime())) {
    return false;
  }

  return fecha
    .toISOString()
    .slice(0, 10) === valor;
};

/*
|--------------------------------------------------------------------------
| Convertir fecha inicial
|--------------------------------------------------------------------------
*/

const obtenerInicioDelDia = (fecha) => {
  if (!fecha) {
    return null;
  }

  return new Date(`${fecha}T00:00:00.000Z`);
};

/*
|--------------------------------------------------------------------------
| Convertir fecha final
|--------------------------------------------------------------------------
*/

const obtenerFinDelDia = (fecha) => {
  if (!fecha) {
    return null;
  }

  return new Date(`${fecha}T23:59:59.999Z`);
};

/*
|--------------------------------------------------------------------------
| Diferencia de días
|--------------------------------------------------------------------------
*/

const calcularDiferenciaDias = (
  fechaInicio,
  fechaFin,
) => {
  const inicio = obtenerInicioDelDia(fechaInicio);
  const fin = obtenerInicioDelDia(fechaFin);

  if (!inicio || !fin) {
    return null;
  }

  const diferencia = fin.getTime() - inicio.getTime();

  return Math.floor(
    diferencia / (1000 * 60 * 60 * 24),
  );
};

/*
|--------------------------------------------------------------------------
| Rango predeterminado
|--------------------------------------------------------------------------
|
| Si no se reciben fechas, se utiliza el mes actual.
|
*/

const obtenerRangoMesActual = (
  fechaReferencia = new Date(),
) => {
  const anio = fechaReferencia.getUTCFullYear();
  const mes = fechaReferencia.getUTCMonth();

  const inicio = new Date(
    Date.UTC(anio, mes, 1),
  );

  const fin = new Date(
    Date.UTC(anio, mes + 1, 0),
  );

  return {
    fecha_inicio: inicio
      .toISOString()
      .slice(0, 10),

    fecha_fin: fin
      .toISOString()
      .slice(0, 10),
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar rango
|--------------------------------------------------------------------------
*/

const normalizarRangoFechas = ({
  fecha_inicio,
  fecha_fin,
  usar_mes_actual = true,
} = {}) => {
  if (
    !fecha_inicio
    && !fecha_fin
    && usar_mes_actual
  ) {
    return obtenerRangoMesActual();
  }

  return {
    fecha_inicio: fecha_inicio || null,
    fecha_fin: fecha_fin || null,
  };
};

/*
|--------------------------------------------------------------------------
| Validar rango máximo
|--------------------------------------------------------------------------
*/

const rangoSuperaLimite = (
  fechaInicio,
  fechaFin,
  diasMaximos =
    RANGO_FECHAS_REPORTE.DIAS_MAXIMOS_CONSULTA,
) => {
  const diferencia = calcularDiferenciaDias(
    fechaInicio,
    fechaFin,
  );

  if (diferencia === null) {
    return false;
  }

  return diferencia > diasMaximos;
};

module.exports = {
  esFechaISO,
  obtenerInicioDelDia,
  obtenerFinDelDia,
  calcularDiferenciaDias,
  obtenerRangoMesActual,
  normalizarRangoFechas,
  rangoSuperaLimite,
};