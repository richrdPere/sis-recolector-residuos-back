require("dotenv").config();
const app = require("./src/app.js");
const http = require("http");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 3000;


// Crear servidor HTTP encima del express
const server = http.createServer(app);

// Inicializar Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});


// Guardamos sockets conectados por usuario
const usuariosConectados = new Map();

/**
 * Middleware del token para sockets
 */
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("No token"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.usuario = decoded;
    next();
  } catch (error) {
    next(new Error("Token inválido"));
  }
});

/**
 * Evento principal de conexión
 */
io.on("connection", (socket) => {
  const userId = socket.usuario.id;

  console.log("Usuario conectado vía WebSocket:", userId);

  // Guardamos relación usuario → socket
  usuariosConectados.set(userId, socket.id);

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", userId);
    usuariosConectados.delete(userId);
  });
});

/**
 * Función global para enviar notificaciones
 */
const sendNotification = (userId, data) => {
  const socketId = usuariosConectados.get(userId);
  if (socketId) {
    io.to(socketId).emit("notificacion", data);
  }
};

// La hacemos global para usarla desde controladores
global.sendNotification = sendNotification;

server.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo con WebSockets en el puerto ${PORT}`);
});
