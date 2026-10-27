const {
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
} = require('../services');

// Utils
const {
  obtenerMetadata,
  responderSolicitud,
  obtenerFiltros,
  obtenerArchivosProcesados,
} = require('../utils/incidencias-controller.utils');

const {
  serializarArchivo,
} = require('../utils/incidencia.utils');

// *********************************************************
// 1. CREAR INCIDENCIA
// *********************************************************
const createIncidenciaController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      createIncidenciaService(
        req.body,
        obtenerMetadata(req),
      ),
    'Incidencia registrada correctamente.',
    'createIncidenciaController',
  );
};

// *********************************************************
// 2. INCIDENCIAS PAGINADAS
// *********************************************************
const getIncidenciasPaginadoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getIncidenciasPaginadoService(
        obtenerFiltros(req.query),
        obtenerMetadata(req),
      ),
    'Incidencias obtenidas correctamente.',
    'getIncidenciasPaginadoController',
  );
};

// *********************************************************
// 3. DETALLE DE INCIDENCIA
// *********************************************************
const getIncidenciaByIdController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getIncidenciaByIdService(
        req.params.id,
        obtenerMetadata(req),
      ),
    'Incidencia obtenida correctamente.',
    'getIncidenciaByIdController',
  );
};

// *********************************************************
// 4. ACTUALIZAR INCIDENCIA
// *********************************************************
const updateIncidenciaController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      updateIncidenciaService(
        req.params.id,
        req.body,
        obtenerMetadata(req),
      ),
    'Incidencia actualizada correctamente.',
    'updateIncidenciaController',
  );
};

// *********************************************************
// 5. ASIGNAR O RETIRAR RESPONSABLE
// *********************************************************
const asignarResponsableIncidenciaController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      asignarResponsableIncidenciaService(
        req.params.id,
        req.body,
        obtenerMetadata(req),
      ),
    'Responsable de la incidencia actualizado correctamente.',
    'asignarResponsableIncidenciaController',
  );
};

// *********************************************************
// 6. CAMBIAR ESTADO DE ATENCIÓN
// *********************************************************
const changeIncidenciaEstadoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      changeIncidenciaEstadoService(
        req.params.id,
        req.body,
        obtenerMetadata(req),
      ),
    'Estado de la incidencia actualizado correctamente.',
    'changeIncidenciaEstadoController',
  );
};

// *********************************************************
// 7. HABILITAR / DESHABILITAR INCIDENCIA
// *********************************************************
const changeIncidenciaHabilitacionController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      changeIncidenciaHabilitacionService(
        req.params.id,
        req.body,
        obtenerMetadata(req),
      ),
    'Habilitación de la incidencia actualizada correctamente.',
    'changeIncidenciaHabilitacionController',
  );
};

// *********************************************************
// 8. ELIMINAR INCIDENCIA
// *********************************************************
const deleteIncidenciaController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      deleteIncidenciaService(
        req.params.id,
        obtenerMetadata(req),
      ),
    'Incidencia eliminada correctamente.',
    'deleteIncidenciaController',
  );
};

// *********************************************************
// 9. AGREGAR ARCHIVOS A UNA INCIDENCIA
//
// Requiere middleware previo de carga y procesamiento.
// *********************************************************
const agregarIncidenciaArchivosController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      agregarIncidenciaArchivosService(
        req.params.id,
        obtenerArchivosProcesados(req),
        obtenerMetadata(req),
      ),
    'Archivos de la incidencia registrados correctamente.',
    'agregarIncidenciaArchivosController',
  );
};

// *********************************************************
// 10. LISTAR ARCHIVOS DE UNA INCIDENCIA
// *********************************************************
const getIncidenciaArchivosController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getIncidenciaArchivosService(
        req.params.id,
        obtenerMetadata(req),
      ),
    'Archivos de la incidencia obtenidos correctamente.',
    'getIncidenciaArchivosController',
  );
};

// *********************************************************
// 11. CONSULTAR METADATOS DE UN ARCHIVO
//
// El service devuelve datos internos para almacenamiento.
// Serializamos antes de responder para ocultar sus rutas.
// Este controller consulta metadatos; no descarga el binario.
// *********************************************************
const getIncidenciaArchivoController = async (req, res) => {
  return responderSolicitud(
    res,
    async () => {
      const archivo = await getIncidenciaArchivoService(
        req.params.id,
        req.params.idArchivo,
        obtenerMetadata(req),
      );

      return serializarArchivo(archivo);
    },
    'Archivo de la incidencia obtenido correctamente.',
    'getIncidenciaArchivoController',
  );
};

// *********************************************************
// 12. ELIMINAR ARCHIVO DE UNA INCIDENCIA
// *********************************************************
const deleteIncidenciaArchivoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      deleteIncidenciaArchivoService(
        req.params.id,
        req.params.idArchivo,
        obtenerMetadata(req),
      ),
    'Archivo de la incidencia eliminado correctamente.',
    'deleteIncidenciaArchivoController',
  );
};

module.exports = {
  createIncidenciaController,
  getIncidenciasPaginadoController,
  getIncidenciaByIdController,
  updateIncidenciaController,
  asignarResponsableIncidenciaController,
  changeIncidenciaEstadoController,
  changeIncidenciaHabilitacionController,
  deleteIncidenciaController,
  agregarIncidenciaArchivosController,
  getIncidenciaArchivosController,
  getIncidenciaArchivoController,
  deleteIncidenciaArchivoController,
};