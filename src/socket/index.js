const { Server } = require("socket.io");
const { addUser, removeUser } = require("./usuariosManager");
const socketAuth = require("./middleware/socketAuth");
const registerHandlers = require("./socketManager");

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    // Middleware JWT
    io.use(socketAuth);

    io.on("connection", (socket) => {
        const userId = socket.usuario.id;
        const roles = socket.usuario?.roles || [];
        // console.log(`🟢 Usuario conectado: ${userId} | Socket: ${socket.id}`);
        // console.log("USUARIO SOCKET:", socket.usuario);

        // ROOM OPERADORES
        if (roles.includes("ADMIN") || roles.includes("OPERADOR")) {
            socket.join("operadores");
            // console.log(`👮 Operador unido a room operadores`);
        }

        // ROOM SERENOS
        if (roles.includes("SERENO") || roles.includes("CONDUCTOR")) {
            socket.join("serenos");
            // console.log("🚓 Sereno unido");
        }

        // Asociar socket al usuario
        addUser(userId, socket.id);
        socket.join(`user_${userId}`); // OPCIONAL

        //Registrar handlers (alertas, tracking, etc.)
        registerHandlers(io, socket);

        // Evento antes de desconectar (debug útil)
        socket.on("disconnecting", (reason) => {
            // console.log(`⚠️ Desconectando: ${userId} | Socket: ${socket.id}`);
            // console.log(`Motivo previo: ${reason}`);

            removeUser(userId, socket.id);
        });

        // Desconexión final
        socket.on("disconnect", (reason) => {
            // console.log(`🔴 Usuario desconectado: ${userId} | Socket: ${socket.id}`);
            // console.log(`Motivo: ${reason}`);

            removeUser(userId, socket.id);
        });
    });
};

const getIO = () => io;

module.exports = { initSocket, getIO };