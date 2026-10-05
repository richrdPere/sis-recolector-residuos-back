const express = require("express");
const router = express.Router();

// Controllers
const {
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
} = require("../controllers/usuario.controller");

// Middlewares
const {
  verificarToken,
  autorizarRoles,
} = require("../../../middlewares/auth.middleware");

// *********************************************************
// AUTENTICACIÓN
// *********************************************************
router.use(verificarToken);

// *********************************************************
// ROLES AUTORIZADOS
// *********************************************************
const ROLES_CONSULTA = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPERVISOR",
  "OPERADOR",
];

const ROLES_GESTION_ROLES = [
  "SUPER_ADMIN",
];

// *********************************************************
// RUTAS DE GESTIÓN Y CONSULTAS
// *********************************************************

// GET /usuarios/paginado
router.get("/paginado",
  autorizarRoles(...ROLES_CONSULTA),
  getUsuariosPaginatedController
);

// GET /usuarios/selector
router.get("/selector",
  autorizarRoles(...ROLES_CONSULTA),
  getUsuarioSelectorController
);

// GET /usuarios/view/:idUsuario
router.get("/view/:idUsuario",
  autorizarRoles(...ROLES_CONSULTA),
  getUsuarioByIdController
);

// GET /usuarios/:idUsuario/roles
router.get("/:idUsuario/roles",
  autorizarRoles(...ROLES_CONSULTA),
  getUsuarioRolesController
);

// POST /usuarios/create
router.post("/create",
  autorizarRoles(...ROLES_CONSULTA),
  createUsuarioController
);

// PUT /usuarios/update/:id_usuario
router.put("/update/:id_usuario",
  autorizarRoles(...ROLES_CONSULTA),
  updateUsuarioController
);

// PATCH /usuarios/estado/:id_usuario
router.patch("/estado/:id_usuario",
  autorizarRoles(...ROLES_CONSULTA),
  changeEstadoUsuarioController
);

// PATCH /usuarios/reset-password/:id_usuario
router.patch("/reset-password/:id_usuario",
  autorizarRoles(...ROLES_CONSULTA),
  resetPasswordUsuarioController
);

// DELETE /usuarios/delete/:id_usuario
router.delete("/delete/:id_usuario",
  autorizarRoles(...ROLES_CONSULTA),
  deleteUsuarioController
);

// GET /usuarios/roles
router.get("/roles",
  autorizarRoles(...ROLES_CONSULTA),
  getRolesController
);

// GET /usuarios/sin-personal
router.get("/sin-personal",
  autorizarRoles(...ROLES_CONSULTA),
  getUsuariosSinPersonalController
);

// *********************************************************
// GESTIÓN DE ROLES
// *********************************************************

// POST /usuarios/:idUsuario/roles
router.post("/:idUsuario/roles",
  autorizarRoles(...ROLES_GESTION_ROLES),
  addUsuarioRolController
);

// DELETE /usuarios/:idUsuario/roles/:idRol
router.delete("/:idUsuario/roles/:idRol",
  autorizarRoles(...ROLES_GESTION_ROLES),
  removeUsuarioRolController
);







module.exports = router;