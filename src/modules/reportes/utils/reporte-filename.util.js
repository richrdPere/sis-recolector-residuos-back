const { EXTENSIONES_EXPORTACION } = require('../constants/reporte.constants');

/*
|--------------------------------------------------------------------------
| Remover caracteres no seguros
|--------------------------------------------------------------------------
*/

const normalizarTextoArchivo = (valor) => {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

/*
|--------------------------------------------------------------------------
| Crear nombre de archivo
|--------------------------------------------------------------------------
*/

const generarNombreReporte = ({
  nombre,
  formato,
  fecha_inicio,
  fecha_fin,
  fecha_generacion = new Date(),
}) => {
  const extension =
    EXTENSIONES_EXPORTACION[formato];

  if (!extension) {
    throw new Error(
      `No existe una extensión para el formato ${formato}.`,
    );
  }

  const nombreNormalizado =
    normalizarTextoArchivo(nombre)
    || 'reporte';

  const fechaGeneracion = fecha_generacion
    .toISOString()
    .slice(0, 10);

  const partes = [
    nombreNormalizado,
  ];

  if (fecha_inicio && fecha_fin) {
    partes.push(
      normalizarTextoArchivo(fecha_inicio),
      normalizarTextoArchivo(fecha_fin),
    );
  } else {
    partes.push(fechaGeneracion);
  }

  return `${partes.join('_')}${extension}`;
};

module.exports = {
  normalizarTextoArchivo,
  generarNombreReporte,
};