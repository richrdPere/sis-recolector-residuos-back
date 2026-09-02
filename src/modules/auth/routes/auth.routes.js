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
} = require('../controllers/auth.controller');

// Middleware
const { verificarToken } = require("../../../middlewares/auth.middleware");

// ROUTES
router.post('/login', loginController);
router.post('/refresh', refreshSessionController);
router.get('/me', verificarToken, getAuthProfileController);
router.post('/logout', verificarToken, logoutController);
router.post('/logout-all', verificarToken, logoutAllController);
router.patch('/change-password', verificarToken, changePasswordController);
router.post('/users', verificarToken, createUsuarioController);

module.exports = router;