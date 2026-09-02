const express = require("express");
const cors = require("cors");
require("dotenv").config();

const path = require("path");
const fs = require("fs");

// Utils
const crearAdminPorDefecto = require("./utils/initAdmin");
const crearRolesPorDefecto = require("./utils/initRoles");

// Routes
const router = require("./routes/index");

// Models
const db = require("./database/models");

const app = express();

// ==========================================================
// CONFIGURACIÓN GENERAL
// ==========================================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// ==========================================================
// DIRECTORIO DE ARCHIVOS
// ==========================================================

/*
 * DESARROLLO:
 *
 * Si UPLOADS_DIR no existe en .env:
 *
 * backend/uploads
 *
 *
 * PRODUCCIÓN:
 *
 * UPLOADS_DIR=/var/www/aryoria/uploads
 */

const uploadsRoot =
  process.env.UPLOADS_DIR ||
  path.join(
    __dirname,
    "../../../uploads"
  );

// ==========================================================
// CREAR DIRECTORIO SI NO EXISTE
// ==========================================================
if (!fs.existsSync(uploadsRoot)) {
  fs.mkdirSync(
    uploadsRoot,
    {
      recursive: true,
    }
  );
}

// ==========================================================
// ARCHIVOS ESTÁTICOS
// ==========================================================
app.use("/uploads", express.static(uploadsRoot, { maxAge: "30d", immutable: false, }));

// ==========================================================
// RUTAS PRINCIPALES DE LA API
// ==========================================================
app.use("/api", router);

// ==========================================================
// FUNCIÓN DE INICIO
// ==========================================================

const startServer = async () => {
  try {

    // MYSQL
    await db.sequelize.authenticate();

    console.log("✅ Conexión a MySQL establecida");

    // MODELOS
    await db.sequelize.sync({ alter: false });

    console.log("📦 Modelos sincronizados");

    // ROLES
    await crearRolesPorDefecto();

    // ADMIN
    await crearAdminPorDefecto();

    // UPLOADS
    // console.log(
    //   `📁 Uploads disponibles en: ${uploadsRoot}`
    // );
  } catch (error) {
    console.error("❌ Error al iniciar servidor:", error);
  }
};

startServer();

module.exports = app;

