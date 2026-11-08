const {
  getAuditoriaPaginadoService,
  getAuditoriaByIdService,
  getAuditoriaByEntidadService,
} = require('../services');

// Utils
const {
  obtenerUsuario,
  obtenerFiltros,
  responderSolicitud,
} = require('../utils/auditoria-controller.utils');

// *********************************************************
// 1. AUDITORÍA PAGINADA
// *********************************************************

const getAuditoriaPaginadoController = async (req, res) => {
  return responderSolicitud(
    res,

    () => getAuditoriaPaginadoService({
      usuario: obtenerUsuario(req),
      query: obtenerFiltros(req.query),
    }),

    'Eventos de auditoría obtenidos correctamente.',
    'getAuditoriaPaginadoController',
  );
};

// *********************************************************
// 2. DETALLE DEL EVENTO
// *********************************************************

const getAuditoriaByIdController = async (req, res) => {
  return responderSolicitud(
    res,

    () => getAuditoriaByIdService({
      idAuditoria: req.params.id,
      usuario: obtenerUsuario(req),
    }),

    'Evento de auditoría obtenido correctamente.',
    'getAuditoriaByIdController',
  );
};

// *********************************************************
// 3. HISTORIAL DE UNA ENTIDAD
// *********************************************************

const getAuditoriaByEntidadController = async (req, res) => {
  return responderSolicitud(
    res,

    () => getAuditoriaByEntidadService({
      tipoEntidad: req.params.tipoEntidad,
      idEntidad: req.params.idEntidad,
      usuario: obtenerUsuario(req),
      query: obtenerFiltros(req.query),
    }),

    'Historial de auditoría de la entidad obtenido correctamente.',
    'getAuditoriaByEntidadController',
  );
};

// *********************************************************
// EXPORTS
// *********************************************************

module.exports = {
  getAuditoriaPaginadoController,
  getAuditoriaByIdController,
  getAuditoriaByEntidadController,
};