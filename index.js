require("dotenv").config();
const app = require("./src/app.js");
const http = require("http");
const db = require('./src/database/models');

// Sockets
const { initSocket } = require('./src/socket');
const { emitToUser } = require('./src/socket/usuarios-manager');

// Jobs
const {
  startNotificationWorker,
  stopNotificationWorker,
} = require('./src/jobs/notification-worker');

// PORT Y HOST
const port = Number(
  process.env.PORT || 3000,
);

const host = process.env.NODE_ENV === 'production'
  ? '127.0.0.1'
  : '0.0.0.0';


async function start() {
  await app.initialize();
  const server = http.createServer(app);
  const io = initSocket(server);

  app.set('io', io);

  // ==========================================================
  // CIERRE ORDENADO DEL BACKEND
  // ==========================================================

  let closing = false;

  const shutdown = async (
    motivo,
    exitCode = 0,
  ) => {
    if (closing) return;

    closing = true;
    process.exitCode = exitCode;

    console.log(
      `Cerrando backend: ${motivo}`,
    );

    // Primero detener el worker y esperar su ejecución actual.
    try {
      await stopNotificationWorker();
    } catch (error) {
      process.exitCode = 1;

      console.error(
        'Error deteniendo notificaciones:',
        error.message,
      );
    }

    // Después cerrar sockets y servidor HTTP.
    try {
      await new Promise((resolve, reject) => {
        io.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    } catch (error) {
      process.exitCode = 1;

      console.error(
        'Error cerrando servidor:',
        error.message,
      );
    }

    // MySQL se cierra al final.
    try {
      await db.sequelize.close();
    } catch (error) {
      process.exitCode = 1;

      console.error(
        'Error cerrando MySQL:',
        error.message,
      );
    }

    console.log('Cierre del backend terminado.');
  };

  // Ctrl+C y cierre habitual de PM2.
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });

  // Terminación del proceso en el servidor.
  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  // MySQL y Firebase ya fueron inicializados por app.initialize().
  const worker = startNotificationWorker();

  console.log(
    'Motor de notificaciones:',
    worker,
  );


  // Compatibilidad con el helper anterior; no persiste ni envía push.
  global.sendNotification = (userId, data) =>
    emitToUser(io, userId, 'notificacion', data)
      .catch(
        (error) => console.error('[notification:socket]', error.name)
      );

  server.on('error',
    (error) => {
      console.error('Error HTTP:', error.code);
      // process.exitCode = 1;

      void shutdown(
        error.code || 'HTTP_ERROR',
        1,
      );
    }
  );
  
  server.listen(
    port,
    host,
    () => {
      console.log(
        `Backend y Socket.IO iniciados en http://${host}:${port}`,
      );
    },
  );
  // server.listen(
  //   process.env.PORT || 3000,
  //   () => console.log('Backend y Socket.IO iniciados.')
  // );
}

start().catch(
  (error) => {
    console.error('No se pudo iniciar el backend:', error.message);
    process.exitCode = 1;
  }
);

