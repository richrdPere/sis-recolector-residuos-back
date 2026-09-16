const fechas = require('./reporte-fechas.util');
const filtros = require('./reporte-filtros.util');
const filename = require('./reporte-filename.util');
const columnas = require('./reporte-columnas.util');

module.exports = {
    ...fechas,
    ...filtros,
    ...filename,
    ...columnas,
};