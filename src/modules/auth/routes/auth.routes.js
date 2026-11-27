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

// Service
const updateAuthProfileService = require('../services/update-auth-profile.service');

// Middleware
const { verificarToken } = require("../../../middlewares/auth.middleware");
const protegerGestionUsuarios = require('../../../middlewares/gestion-usuarios.middleware',);

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
router.post('/users', verificarToken, protegerGestionUsuarios, createUsuarioController);
router.patch('/me', verificarToken, async (req, res, next) => {
    try {
        const data = await updateAuthProfileService({
            id_usuario: req.usuario?.id_usuario ?? req.usuario?.id,
            payload: req.body,
        });

        return res.json({
            success: true,
            message: 'Tus datos personales se actualizaron correctamente.',
            data,
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;