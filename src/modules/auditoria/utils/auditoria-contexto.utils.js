const { AsyncLocalStorage } = require('node:async_hooks');
const { randomUUID } = require('node:crypto');
const { isIP } = require('node:net');

const AppError = require('../../../utils/app-error');

const almacenamiento = new AsyncLocalStorage();

// *********************************************************
// MIDDLEWARE
// *********************************************************

const contextoAuditoriaMiddleware = (req, res, next) => {
  // Generado por el servidor, no por el cliente.
  const requestId = randomUUID();

  res.set('X-Request-Id', requestId);

  almacenamiento.run(
    {
      req,
      requestId,
    },
    () => next(),
  );
};

// *********************************************************
// CONTEXTO DISPONIBLE PARA LOS SERVICES
// *********************************************************
const obtenerContextoAuditoria = ({
  usuario,
  tipo_actor = 'USUARIO',
} = {}) => {
  const almacenado = almacenamiento.getStore();
  const req = almacenado?.req;

  // req.usuario se consulta al registrar el evento.
  // Por eso el middleware puede ejecutarse antes de verificarToken.
  const actor = usuario ?? req?.usuario ?? null;

  if (tipo_actor === 'USUARIO' && !actor) {
    throw new AppError(
      'No existe un actor autenticado para registrar la auditoría.',
      500,
      'AUDITORIA_ACTOR_NO_DISPONIBLE',
    );
  }

  const origenSolicitado = String(
    req?.get('x-client-origin') ?? '',
  ).toUpperCase();

  const origenes = {
    WEB: 'WEB',
    APP: 'MOVIL',
    MOVIL: 'MOVIL',
    API: 'API',
  };

  const ip = req?.ip ?? null;

  const userAgent = req?.get('user-agent');

  return {
    usuario: tipo_actor === 'USUARIO' ? actor : null,
    tipo_actor,

    contexto: {
      request_id: almacenado?.requestId ?? null,

      origen: tipo_actor === 'SISTEMA'
        ? 'SISTEMA'
        : origenes[origenSolicitado] ?? 'DESCONOCIDO',

      ip: ip && isIP(ip) ? ip : null,

      user_agent:
        typeof userAgent === 'string' && userAgent.trim()
          ? userAgent.trim().slice(0, 1000)
          : null,
    },
  };
};

module.exports = {
  contextoAuditoriaMiddleware,
  obtenerContextoAuditoria,
};