const { id } = require('./utils/errors');
const usuarios = new Map();

function addUser(userId, socketId) {
  const key = id(userId);
  if (!usuarios.has(key)) usuarios.set(key, new Set());
  usuarios.get(key).add(socketId);
}

function removeUser(userId, socketId) {
  const key = id(userId), sockets = usuarios.get(key);
  if (!sockets) return;
  sockets.delete(socketId); if (!sockets.size) usuarios.delete(key);
}

const getUserSockets = (userId) => new Set(usuarios.get(id(userId)) || []);
const isUserConnected = (userId) => getUserSockets(userId).size > 0;
const getConnectedUserIds = () => [...usuarios.keys()];
const getConnectedUsersCount = () => usuarios.size;

async function emitToUser(io, userId, event, data) {
  const { emitAuthorized } = require('./services/delivery.service');
  const R = require('./constants/socket-rooms.constants');
  return emitAuthorized(io, [R.usuario(userId)], event, data);
}
module.exports = {
  addUser,
  removeUser,
  getUserSockets,
  isUserConnected,
  getConnectedUserIds,
  getConnectedUsersCount,
  emitToUser
};
