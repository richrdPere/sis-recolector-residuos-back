const {
  createMantenimientoService,
  getMantenimientosPaginatedService,
  getMantenimientoByIdService,
  updateMantenimientoService,
  iniciarMantenimientoService,
  finalizarMantenimientoService,
  cancelarMantenimientoService,
  getMantenimientosByVehiculoService,
  getMantenimientosProximosService,
} = require('../services');

// Utils 
const {
  obtenerUsuarioId,
  responderSolicitud,
  obtenerFiltros,
} = require("../utils/mantenimientos-controller.utils");

// *********************************************************
// 1. CREAR MANTENIMIENTO
// *********************************************************
const createMantenimientoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      createMantenimientoService({
        usuarioId: obtenerUsuarioId(req),
        body: req.body,
      }),
    'Mantenimiento registrado correctamente.',
    'createMantenimientoController',
  );
};

// *********************************************************
// 2. MANTENIMIENTOS PAGINADOS
// *********************************************************
const getMantenimientosPaginatedController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getMantenimientosPaginatedService(
        obtenerFiltros(req.query),
      ),
    'Mantenimientos obtenidos correctamente.',
    'getMantenimientosPaginatedController',
  );
};

// *********************************************************
// 3. DETALLE E HISTORIAL DEL MANTENIMIENTO
// *********************************************************
const getMantenimientoByIdController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getMantenimientoByIdService(req.params.id),
    'Mantenimiento obtenido correctamente.',
    'getMantenimientoByIdController',
  );
};

// *********************************************************
// 4. ACTUALIZAR MANTENIMIENTO
// *********************************************************
const updateMantenimientoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      updateMantenimientoService({
        idMantenimiento: req.params.id,
        usuarioId: obtenerUsuarioId(req),
        body: req.body,
      }),
    'Mantenimiento actualizado correctamente.',
    'updateMantenimientoController',
  );
};

// *********************************************************
// 5. INICIAR MANTENIMIENTO
// *********************************************************

const iniciarMantenimientoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      iniciarMantenimientoService({
        idMantenimiento: req.params.id,
        usuarioId: obtenerUsuarioId(req),
        body: req.body ?? {},
      }),
    'Intervención de mantenimiento iniciada correctamente.',
    'iniciarMantenimientoController',
  );
};

// *********************************************************
// 6. FINALIZAR MANTENIMIENTO
// *********************************************************
const finalizarMantenimientoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      finalizarMantenimientoService({
        idMantenimiento: req.params.id,
        usuarioId: obtenerUsuarioId(req),
        body: req.body,
      }),
    'Mantenimiento finalizado correctamente.',
    'finalizarMantenimientoController',
  );
};

// *********************************************************
// 7. CANCELAR MANTENIMIENTO
// *********************************************************
const cancelarMantenimientoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      cancelarMantenimientoService({
        idMantenimiento: req.params.id,
        usuarioId: obtenerUsuarioId(req),
        body: req.body,
      }),
    'Mantenimiento cancelado correctamente.',
    'cancelarMantenimientoController',
  );
};

// *********************************************************
// 8. HISTORIAL DE MANTENIMIENTOS DEL VEHÍCULO
// *********************************************************
const getMantenimientosByVehiculoController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getMantenimientosByVehiculoService({
        idVehiculo: req.params.idVehiculo,
        query: obtenerFiltros(req.query),
      }),
    'Historial de mantenimientos del vehículo obtenido correctamente.',
    'getMantenimientosByVehiculoController',
  );
};

// *********************************************************
// 9. PRÓXIMOS MANTENIMIENTOS
// *********************************************************
const getMantenimientosProximosController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getMantenimientosProximosService({
        dias: req.query.dias,
        page: req.query.page,
        limit: req.query.limit,
        id_vehiculo: req.query.id_vehiculo,
        tipo_mantenimiento: req.query.tipo_mantenimiento,
      }),
    'Próximos mantenimientos obtenidos correctamente.',
    'getMantenimientosProximosController',
  );
};

// *********************************************************
// EXPORTS
// *********************************************************
module.exports = {
  createMantenimientoController,
  getMantenimientosPaginatedController,
  getMantenimientoByIdController,
  updateMantenimientoController,
  iniciarMantenimientoController,
  finalizarMantenimientoController,
  cancelarMantenimientoController,
  getMantenimientosByVehiculoController,
  getMantenimientosProximosController,
};