require("dotenv").config();
const app = require("./src/app.js");
const http = require("http");

const { initSocket } = require('./src/socket');
const { emitToUser } = require('./src/socket/usuarios-manager');

async function start() {
  await app.initialize();
  const server = http.createServer(app);
  const io = initSocket(server);

  // Compatibilidad con el helper anterior; no persiste ni envía push.
  global.sendNotification = (userId, data) =>
    emitToUser(io, userId, 'notificacion', data)
      .catch(
        (error) => console.error('[notification:socket]', error.name)
      );

  server.on('error',
    (error) => {
      console.error('Error HTTP:', error.code);
      process.exitCode = 1;
    }
  );
  server.listen(
    process.env.PORT || 3000,
    () => console.log('Backend y Socket.IO iniciados.')
  );
}

start().catch(
  (error) => {
    console.error('No se pudo iniciar el backend:', error.message);
    process.exitCode = 1;
  }
);

