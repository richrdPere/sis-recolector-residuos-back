const { Transaction } = require('sequelize');

const db = require('../../../database/models');

const {
  validarFiltrosAuditoria,
} = require('../validations/auditoria.validation');

const {
  autorizarConsultaAuditoria,
  construirWhere,
  atributosConsulta,
} = require('../utils/auditoria-service.utils');

const {
  AuditoriaEvento,
  sequelize,
} = db;

// *********************************************************
// SERVICE: AUDITORÍA PAGINADA
// *********************************************************

const getAuditoriaPaginadoService = async ({
  usuario,
  query = {},
}) => {
  const acceso = autorizarConsultaAuditoria(usuario);
  const validado = validarFiltrosAuditoria(query);

  const {
    page,
    limit,
    sortOrder,
    filtros,
  } = validado;

  const where = construirWhere(validado, acceso);

  return sequelize.transaction(
    {
      isolationLevel:
        Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    },
    async transaction => {
      const { rows, count } = await AuditoriaEvento.findAndCountAll({
        attributes: atributosConsulta(acceso),
        where,

        order: [
          ['fecha_servidor', sortOrder],
          ['id_auditoria', sortOrder],
        ],

        limit,
        offset: (page - 1) * limit,

        transaction,
      });

      const totalPages = Math.ceil(count / limit);

      return {
        items: rows.map(item => item.get({ plain: true })),

        filtros_aplicados: filtros,

        pagination: {
          page,
          limit,
          total: count,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_previous_page: page > 1,
        },

        metadata: {
          zona_horaria: 'America/Lima',
          generado_en: new Date().toISOString(),

          orden: {
            sort_by: 'fecha_servidor',
            sort_order: sortOrder,
          },

          alcance: acceso.accesoCompleto
            ? 'COMPLETO'
            : 'METADATOS_OPERATIVOS',

          generado_por: acceso.id,
        },
      };
    },
  );
};

module.exports = {
  getAuditoriaPaginadoService,
};