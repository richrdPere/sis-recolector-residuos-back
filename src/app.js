const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');

require('dotenv').config();

// Documentación
const swaggerUi = require('swagger-ui-express');
const openapiDocument = require('./docs/openapi.js');

// Firebase
const { initializeFirebaseAdmin } = require('./config/firebase-admin');

// Inicialización
const crearAdminPorDefecto = require('./utils/initAdmin');
const crearRolesPorDefecto = require('./utils/initRoles');

// Directorio centralizado de archivos
const { uploadsRoot } = require('./config/uploads');

// Rutas y modelos
const router = require('./routes/index');
const db = require('./database/models');

const app = express();

// ==========================================================
// DOCUMENTACIÓN REST/API
// ==========================================================
app.get('/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});

app.use('/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openapiDocument, {
    customSiteTitle: 'Catálogo REST/API - Recolección de Residuos',
    swaggerOptions: {
      docExpansion: 'list',
      displayRequestDuration: true,
      validatorUrl: null,
    },
  }),
);

// ==========================================================
// CONFIGURACIÓN GENERAL
// ==========================================================
app.use(cors());

app.use(
  express.json({
    limit: '10mb',
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  }),
);

// ==========================================================
// DIRECTORIO DE ARCHIVOS
// La ruta se obtiene únicamente desde config/uploads.js.
// ==========================================================
fs.mkdirSync(
  uploadsRoot,
  {
    recursive: true,
  },
);

// ==========================================================
// FOTOGRAFÍAS PÚBLICAS DE VEHÍCULOS
// Debe ubicarse antes de la publicación general de uploads.
// ==========================================================
app.use('/uploads/vehiculos',
  express.static(
    path.join(uploadsRoot, 'vehiculos'),
    {
      maxAge: '1d',
      index: false,
      dotfiles: 'deny',

      setHeaders(res) {
        res.setHeader(
          'Cross-Origin-Resource-Policy',
          'cross-origin',
        );
      },
    },
  ),
);

// ==========================================================
// ARCHIVOS ESTÁTICOS
// ==========================================================
// Los archivos restantes no se publican como estáticos.
// Las evidencias se consultan por sus endpoints autorizados.
app.use('/uploads', (_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Archivo no disponible por esta dirección.',
  });
});

// ==========================================================
// RUTAS PRINCIPALES
// ==========================================================
app.use('/api', router);

// ==========================================================
// MANEJADOR GLOBAL DE ERRORES
// ==========================================================
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const codigo = Number(
    err.statusCode ?? err.status,
  );

  const statusCode =
    Number.isInteger(codigo) &&
      codigo >= 400 &&
      codigo <= 599
      ? codigo
      : 500;

  console.error(
    '❌ Error en la API:',
    err,
  );

  return res.status(statusCode).json({
    success: false,

    message:
      statusCode < 500
        ? err.message ||
        'No se pudo completar la operación.'
        : 'Ocurrió un error interno del servidor.',
  });
});

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
const startServer = async () => {
  try {
    await db.sequelize.authenticate();

    console.log('✅ Conexión a MySQL establecida');

    if (process.env.NODE_ENV !== 'production') {
      await db.sequelize.sync({
        alter: false,
      });

      console.log('📦 Modelos sincronizados');

      await crearRolesPorDefecto();
      await crearAdminPorDefecto();
    } else {
      console.log(
        '📦 Producción: sincronización y creación inicial de usuarios deshabilitadas.',
      );
    }

    initializeFirebaseAdmin();
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);

    throw error;
  }
};

app.initialize = startServer;

module.exports = app;