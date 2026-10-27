
const createIncidenciaService = require('./create-incidencia.service');
const getIncidenciasPaginadoService = require('./get-incidencias-paginado.service');
const getIncidenciaByIdService = require('./get-incidencia-by-id.service');
const updateIncidenciaService = require('./update-incidencia.service');
const asignarResponsableIncidenciaService = require('./asignar-responsable-incidencia.service');
const changeIncidenciaEstadoService = require('./change-incidencia-estado.service');
const changeIncidenciaHabilitacionService = require('./change-incidencia-habilitacion.service');
const deleteIncidenciaService = require('./delete-incidencia.service');
const agregarIncidenciaArchivosService = require('./agregar-incidencia-archivos.service');
const getIncidenciaArchivosService = require('./get-incidencia-archivos.service');
const getIncidenciaArchivoService = require('./get-incidencia-archivo.service');
const deleteIncidenciaArchivoService = require('./delete-incidencia-archivo.service');

module.exports = {
  createIncidenciaService,
  getIncidenciasPaginadoService,
  getIncidenciaByIdService,
  updateIncidenciaService,
  asignarResponsableIncidenciaService,
  changeIncidenciaEstadoService,
  changeIncidenciaHabilitacionService,
  deleteIncidenciaService,
  agregarIncidenciaArchivosService,
  getIncidenciaArchivosService,
  getIncidenciaArchivoService,
  deleteIncidenciaArchivoService,
};