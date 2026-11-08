const db = require('../../../database/models');

const { RefreshToken } = db;

// Auditoria
const { prepararAuditoria } = require('../../auditoria/utils/auditar-cambio.utils');


const logoutAllService = async ({
  id_usuario,
}) => {
  const [closedSessions] = await RefreshToken.update(
    {
      estado: false,
      fecha_revocacion: new Date(),
    },
    {
      where: {
        id_usuario,
        estado: true,
        fecha_revocacion: null,
      },
    },
  );

  if (closedSessions > 0) {
    const auditarLogout = prepararAuditoria(
      'SESION',
      'CERRAR_TODAS_LAS_SESIONES',
      {
        id_usuario,
        sesiones_cerradas: 0,
      },
    );

    await auditarLogout(
      {
        id_usuario,
        sesiones_cerradas: closedSessions,
      },
      transaction,
    );
  }

  return {
    session_closed: true,
    closed_sessions: closedSessions,
  };
};

module.exports = logoutAllService;