const { Op } = require('sequelize');

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
  MODULOS_SUPERVISOR,
} = require('../constants/auditoria.constants');

const {
  validarId,
} = require('../validations/auditoria.validation');

const {
  autorizarConsultaAuditoria,
  atributosConsulta,
} = require('../utils/auditoria-service.utils');

const { AuditoriaEvento } = db;

// *********************************************************
// SERVICE: AUDITORÍA POR ID
// *********************************************************

const getAuditoriaByIdService = async ({
  idAuditoria,
  usuario,
}) => {
  const acceso = autorizarConsultaAuditoria(usuario);

  const id = validarId(
    idAuditoria,
    'id_auditoria',
  );

  const where = {
    id_auditoria: id,
  };

  if (!acceso.accesoCompleto) {
    where.modulo = {
      [Op.in]: MODULOS_SUPERVISOR,
    };
  }

  const evento = await AuditoriaEvento.findOne({
    where,
    attributes: atributosConsulta(acceso, true),
  });

  if (!evento) {
    throw new AppError(
      'El evento de auditoría no existe o no está disponible.',
      404,
      'AUDITORIA_NO_ENCONTRADA',
    );
  }

  return {
    evento: evento.get({ plain: true }),

    metadata: {
      alcance: acceso.accesoCompleto
        ? 'COMPLETO'
        : 'METADATOS_OPERATIVOS',
    },
  };
};

module.exports = {
  getAuditoriaByIdService,
};