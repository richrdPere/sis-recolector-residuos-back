const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/routes/auth.routes");
const vehiculoRoutes = require("../modules/vehiculos/routes/vehiculo.routes");
const personalRoutes = require('../modules/personal/routes');
const rutasRoutes = require("../modules/rutas/routes");
const programacionRoutes = require('../modules/programaciones/routes');
const recorridoRoutes = require('../modules/recorridos/routes');

// Rutas
router.use("/auth", authRoutes);
router.use("/vehiculos", vehiculoRoutes);
router.use('/personal', personalRoutes);
router.use('/rutas', rutasRoutes);
router.use('/programaciones', programacionRoutes);
router.use('/recorridos', recorridoRoutes);

module.exports = router;