const {
  getUsuariosPaginatedService,
  getUsuarioSelectorService,
  addUsuarioRolService,
  removeUsuarioRolService,
  getUsuarioByIdService,
  getUsuarioRolesService,
  changeEstadoUsuarioService,
  createUsuarioService,
  deleteUsuarioService,
  resetPasswordUsuarioService,
  updateUsuarioService,
  getRolesService,
  getUsuariosSinPersonalService,
} = require("../services");

// *********************************************************
// UTILIDAD: EJECUTAR SERVICIO Y RESPONDER
// *********************************************************
const responderSolicitud = async (
  res,
  ejecutar,
  message,
  contexto
) => {
  try {
    const data = await ejecutar();

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode <= 599
      ? error.statusCode
      : 500;

    if (statusCode >= 500) {
      console.error(`[${contexto}]`, error);
    }

    return res.status(statusCode).json({
      success: false,

      message: statusCode >= 500
        ? "Ocurrió un error interno al procesar la solicitud."
        : error.message,

      data: null,
    });
  }
};

// *********************************************************
// 1. USUARIOS PAGINADOS
// *********************************************************
const getUsuariosPaginatedController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getUsuariosPaginatedService({
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        // estado: req.query.estado,
        id_rol: req.query.id_rol,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order,
      }),
    "Usuarios obtenidos correctamente.",
    "getUsuariosPaginatedController"
  );
};

// *********************************************************
// 2. SELECTOR DE USUARIOS
// *********************************************************
const getUsuarioSelectorController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getUsuarioSelectorService({
        search: req.query.search,
        id_rol: req.query.id_rol,
        limit: req.query.limit,
      }),
    "Selector de usuarios obtenido correctamente.",
    "getUsuarioSelectorController"
  );
};

// *********************************************************
// 3. AGREGAR / REACTIVAR ROL
// *********************************************************
const addUsuarioRolController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      addUsuarioRolService({
        id_usuario: req.params.idUsuario,
        id_rol: req.body?.id_rol,
      }),
    "El rol está asignado al usuario.",
    "addUsuarioRolController"
  );
};

// *********************************************************
// 4. REMOVER / DESACTIVAR ROL
// *********************************************************
const removeUsuarioRolController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      removeUsuarioRolService({
        id_usuario: req.params.idUsuario,
        id_rol: req.params.idRol,
      }),
    "El rol está desactivado para el usuario.",
    "removeUsuarioRolController"
  );
};

// *********************************************************
// 5. USUARIO POR ID
// *********************************************************
const getUsuarioByIdController = async (req, res) => {
  return responderSolicitud(
    res,
    () => getUsuarioByIdService(req.params.idUsuario),
    "Usuario obtenido correctamente.",
    "getUsuarioByIdController"
  );
};

// *********************************************************
// 6. ROLES DE UN USUARIO
// *********************************************************
const getUsuarioRolesController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      getUsuarioRolesService({
        id_usuario: req.params.idUsuario,
        estado: req.query.estado,
      }),
    "Roles del usuario obtenidos correctamente.",
    "getUsuarioRolesController"
  );
};

// *********************************************************
// 7. ROLES DE UN USUARIO
// *********************************************************
const changeEstadoUsuarioController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      changeEstadoUsuarioService({
        ...req.body,
        id_usuario: req.params.id_usuario,
      }),
    "Estado del usuario actualizado correctamente.",
    "changeEstadoUsuarioController"
  );
};

// *********************************************************
// 8. CREAR USUARIO
// *********************************************************
const createUsuarioController = async (req, res) => {
  return responderSolicitud(
    res,
    () => createUsuarioService(req.body),
    "Usuario registrado correctamente.",
    "createUsuarioController"
  );
};

// *********************************************************
// 9. ACTUALIZAR USUARIO
// *********************************************************
const updateUsuarioController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      updateUsuarioService({
        ...req.body,

        // El ID de la URL prevalece sobre el body.
        id_usuario: req.params.id_usuario,
      }),
    "Usuario actualizado correctamente.",
    "updateUsuarioController"
  );
};

// *********************************************************
// 10. ACTUALIZAR USUARIO
// *********************************************************
const deleteUsuarioController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      deleteUsuarioService({
        id_usuario: req.params.id_usuario,
      }),
    "Usuario eliminado correctamente.",
    "deleteUsuarioController"
  );
};

// *********************************************************
// 11. RESTABLECER CONTRASEÑA
// *********************************************************
const resetPasswordUsuarioController = async (req, res) => {
  return responderSolicitud(
    res,
    () =>
      resetPasswordUsuarioService({
        ...req.body,
        id_usuario: req.params.id_usuario,
      }),
    "Contraseña restablecida correctamente.",
    "resetPasswordUsuarioController"
  );
};

// *********************************************************
// 12. OBTENER CATÁLOGO DE ROLES
// *********************************************************
const getRolesController = async (req, res) => {
  return responderSolicitud(
    res,
    () => getRolesService(),
    "Roles obtenidos correctamente.",
    "getRolesController"
  );
};

// *********************************************************
// 13. OBTENER CATÁLOGO DE ROLES
// *********************************************************
const getUsuariosSinPersonalController = async (req, res) => {
  return responderSolicitud(
    res,
    () => getUsuariosSinPersonalService(),
    "Usuarios sin personal obtenidos correctamente.",
    "getUsuariosSinPersonalController"
  );
};

module.exports = {
  getUsuariosPaginatedController,
  getUsuarioSelectorController,
  addUsuarioRolController,
  removeUsuarioRolController,
  getUsuarioByIdController,
  getUsuarioRolesController,
  changeEstadoUsuarioController,
  createUsuarioController,
  updateUsuarioController,
  deleteUsuarioController,
  resetPasswordUsuarioController,
  getRolesController,
  getUsuariosSinPersonalController,
};