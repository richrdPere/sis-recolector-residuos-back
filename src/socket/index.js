const { Server } = require('socket.io');
const jwtAuth = require('./middleware/socket-auth');
const { refreshIdentity } = require('./services/identity.service');
const { pruneRooms } = require('./services/delivery.service');

const registerHandlers = require('./socket-manager');
const registerPublic = require('./handlers/ciudadano.handler');
const publishPublic = require('./emitters/ciudadano.emitter');

const { install } = require('./services/model-events.service');
const { addUser, removeUser } = require('./usuarios-manager');
const { responseError } = require('./utils/errors');

const R = require('./constants/socket-rooms.constants');
const E = require('./constants/socket-events.constants');
let io;

function initSocket(server) {
  if (io) throw new Error('Socket.IO ya fue inicializado.');
  const origins = (process.env.SOCKET_CORS_ORIGINS || 'http://localhost:4200').split(',').map((s) => s.trim()).filter(Boolean);
  const allowed = (origin) => !origin || origins.includes(origin);
  io = new Server(server, {
    cors: { origin: (origin, cb) => cb(null, allowed(origin)), methods: ['GET', 'POST'] },
    allowRequest: (req, cb) => cb(null, allowed(req.headers.origin)),
    maxHttpBufferSize: 65536,
    // No activar skipMiddlewares de connectionStateRecovery: siempre reautenticar.
  });
  io.use(jwtAuth);
  io.use(async (socket, next) => {
    try {
      socket.data.jwtClaims = { ...socket.data.usuario };
      await refreshIdentity(socket);
    } catch (error) {
      const result = responseError(error), wrapped = new Error(result.message);
      wrapped.data = result; return next(wrapped);
    }
    next();
  });
  io.on('connection', (socket) => {
    const user = socket.data.usuario;
    addUser(user.id_usuario, socket.id);
    socket.join(R.usuario(user.id_usuario));
    registerHandlers(io, socket);
    // Temporizador acotado para fechas lejanas; reprograma hasta expirar.
    let timer;
    const expire = () => {
      const remaining = user.exp * 1000 - Date.now();
      if (remaining <= 0) {
        socket.emit(E.AUTH_ERROR, { code: 'ACCESS_TOKEN_EXPIRED', message: 'Renueve el token por REST y vuelva a conectar.' });
        socket.disconnect(true); return;
      }
      timer = setTimeout(expire, Math.min(remaining, 2147483647)); timer.unref?.();
    };
    expire();
    socket.on('disconnect', () => { clearTimeout(timer); removeUser(user.id_usuario, socket.id); });
  });
  io.of('/publico').on('connection', (socket) => registerPublic(io, socket));
  const uninstall = install(io);
  let busy = false;
  const interval = setInterval(async () => {
    if (busy) return; busy = true;
    try {
      for (const socket of io.of('/').sockets.values()) {
        try { await pruneRooms(socket); }
        catch (error) { socket.emit(E.AUTH_ERROR, responseError(error)); socket.disconnect(true); }
      }
      await publishPublic(io);
    } catch (error) { console.error('[socket:maintenance]', error.name); }
    finally { busy = false; }
  }, 15000);
  interval.unref?.();
  server.once('close', () => { clearInterval(interval); uninstall(); io = undefined; });
  return io;
}
const getIO = () => io;
module.exports = { initSocket, getIO };
