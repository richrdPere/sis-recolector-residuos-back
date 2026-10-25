const express = require('express');
const router = express.Router();

// Controllers
const {
    createUsuarioController,
    loginController,
    refreshSessionController,
    logoutController,
    logoutAllController,
    getAuthProfileController,
    changePasswordController,
    registerCiudadanoController,
} = require('../controllers/auth.controller');

// Middleware
const { verificarToken } = require("../../../middlewares/auth.middleware");

// ROUTES

// - Rutas públicas
router.post('/register', registerCiudadanoController);
router.post('/login', loginController);
router.post('/refresh', refreshSessionController);

// - Rutas autenticadas
router.get('/me', verificarToken, getAuthProfileController);
router.post('/logout', verificarToken, logoutController);
router.post('/logout-all', verificarToken, logoutAllController);
router.patch('/change-password', verificarToken, changePasswordController);
router.post('/users', verificarToken, createUsuarioController);

module.exports = router;