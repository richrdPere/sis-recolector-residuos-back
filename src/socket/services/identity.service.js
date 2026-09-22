const db = require('../../database/models');
const { fail, id } = require('../utils/errors');
const { normalizeRoles } = require('../../middlewares/auth.middleware');

// session_id corresponde a RefreshToken.jti según refresh-session.service.js.
// Si el emisor JWT usa otro claim, debe declararse explícitamente en .env.
async function refreshIdentity(socket) {
  const claims = socket.data.jwtClaims || socket.data.usuario;
  if (!claims || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= Date.now()) {
    throw fail('El token de acceso ha expirado.', 'ACCESS_TOKEN_EXPIRED', 401);
  }
  const userId = id(claims.id_usuario);
  const sessionId = claims[process.env.SOCKET_SESSION_CLAIM || 'session_id'];

  if (typeof sessionId !== 'string' || !sessionId || sessionId.length > 36) {
    throw fail('El access token no identifica la sesión.', 'SESSION_CLAIM_REQUIRED', 401);
  }

  const session = await db.RefreshToken.findOne(
    {
      where: {
        id_usuario: userId,
        jti: sessionId,
        estado: true,
        fecha_revocacion: null,
      }
    });

  if (!session || !(new Date(session.fecha_expiracion).getTime() > Date.now())) {
    throw fail(
      'La sesión expiró o fue revocada.',
      'SESSION_REVOKED',
      401
    );
  }

  const user = await db.Usuario.findByPk(userId, {
    attributes: ['id_usuario', 'estado'],
    include: [
      {
        association: 'persona',
        attributes: ['id_persona', 'estado'],
        required: true
      },
      {
        model: db.Roles,
        as: 'roles',
        attributes: ['nombre'],
        where: { estado: true },
        through: {
          where: { estado: true },
          attributes: []
        },
        required: false
      },
    ],
  });

  if (!user?.estado || !user.persona?.estado)
    throw fail('Usuario inactivo.', 'USER_INACTIVE', 401);

  const roles = normalizeRoles(user.roles.map((role) => role.nombre));

  if (!roles.length)
    throw fail(
      'Usuario sin roles activos.',
      'USER_WITHOUT_ACTIVE_ROLE',
      401
    );

  socket.data.usuario = {
    id: userId,
    id_usuario: userId,
    session_id: sessionId,
    exp: claims.exp,
    roles
  };

  socket.usuario = socket.data.usuario;

  return socket.data.usuario;
}
module.exports = {
  refreshIdentity
};
