const sequelize = require('../../../config/database');

// Validations
const {
  validarId,
  validarHabilitacion,
} = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: HABILITAR / DESHABILITAR
// ==========================================================

const changeIncidenciaHabilitacionService = async (
  id,
  payload,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const data = validarHabilitacion(payload);
  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      // Auditoria
      const auditar = prepararAuditoria('INCIDENCIA', 'CAMBIAR_HABILITACION', incidencia);

      await authorizeIncidencia(
        'cambiar_habilitacion',
        actor,
        {
          incidencia,
          datos: data,
          transaction,
        },
      );

      await incidencia.update(data, {
        transaction,
      });

      // Auditoria
      await auditar(incidencia, transaction);

      return getIncidenciaDetail(
        incidenciaId,
        transaction,
      );
    },
  );
};

module.exports = changeIncidenciaHabilitacionService;