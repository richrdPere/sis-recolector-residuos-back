const AppError = require('../../../utils/app-error');

const {
  esObjeto,
  validarCodigo,
  validarIdEntidad,
} = require('../validations/auditoria.validation');

const {
  getAuditoriaPaginadoService,
} = require('./get-auditoria-paginado.service');

// *********************************************************
// SERVICE: HISTORIAL DE AUDITORÍA DE UNA ENTIDAD
// *********************************************************

const getAuditoriaByEntidadService = async ({
  tipoEntidad,
  idEntidad,
  usuario,
  query = {},
}) => {
  if (!esObjeto(query)) {
    throw new AppError(
      'Los filtros no son válidos.',
      400,
      'AUDITORIA_DATOS_INVALIDOS',
    );
  }

  if (
    Object.hasOwn(query, 'tipo_entidad') ||
    Object.hasOwn(query, 'id_entidad')
  ) {
    throw new AppError(
      'La entidad debe indicarse únicamente en los parámetros de la ruta.',
      400,
      'AUDITORIA_FILTROS_ENTIDAD',
    );
  }

  const tipo = validarCodigo(
    tipoEntidad,
    'tipo_entidad',
    80,
    true,
  );

  const id = validarIdEntidad(idEntidad);

  return getAuditoriaPaginadoService({
    usuario,

    query: {
      ...query,
      tipo_entidad: tipo,
      id_entidad: id,
    },
  });
};

module.exports = {
  getAuditoriaByEntidadService,
};