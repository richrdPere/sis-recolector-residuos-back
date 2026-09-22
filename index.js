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


// // Crear servidor HTTP encima del express
// const server = http.createServer(app);

// // Inicializar Socket.IO
// const io = socketIO(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });


// // Guardamos sockets conectados por usuario
// const usuariosConectados = new Map();

// /**
//  * Middleware del token para sockets
//  */
// io.use((socket, next) => {
//   const token = socket.handshake.auth.token;

//   if (!token) return next(new Error("No token"));

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     socket.usuario = decoded;
//     next();
//   } catch (error) {
//     next(new Error("Token inválido"));
//   }
// });

// /**
//  * Evento principal de conexión
//  */
// io.on("connection", (socket) => {
//   const userId = socket.usuario.id;

//   console.log("Usuario conectado vía WebSocket:", userId);

//   // Guardamos relación usuario → socket
//   usuariosConectados.set(userId, socket.id);

//   socket.on("disconnect", () => {
//     console.log("Usuario desconectado:", userId);
//     usuariosConectados.delete(userId);
//   });
// });

// /**
//  * Función global para enviar notificaciones
//  */
// const sendNotification = (userId, data) => {
//   const socketId = usuariosConectados.get(userId);
//   if (socketId) {
//     io.to(socketId).emit("notificacion", data);
//   }
// };

// // La hacemos global para usarla desde controladores
// global.sendNotification = sendNotification;

// // Inicializar Socket.IO
// initSocket(server);

// server.listen(PORT, () => {
//   console.log(`🚀 Servidor backend corriendo con WebSockets en el puerto ${PORT}`);
// });
