const sequelize = require('../../../config/database');

// Validations
const { validarId } = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: DETALLE DE INCIDENCIA
// ==========================================================

const getIncidenciaByIdService = async (
  id,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
      );

      await authorizeIncidencia('ver', actor, {
        incidencia,
        transaction,
      });

      return getIncidenciaDetail(
        incidenciaId,
        transaction,
      );
    },
  );
};

module.exports = getIncidenciaByIdService;