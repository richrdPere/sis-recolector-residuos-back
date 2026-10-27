const AppError = require('../../../utils/app-error');
const sequelize = require('../../../config/database');

// Validations
const {
  validarId,
  validarActualizarIncidencia,
  validarUbicacion,
} = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  ensureIncidenciaOpen,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: ACTUALIZAR INCIDENCIA
// ==========================================================

const updateIncidenciaService = async (
  id,
  payload,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const data = validarActualizarIncidencia(payload);
  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      await authorizeIncidencia('actualizar', actor, {
        incidencia,
        datos: data,
        transaction,
      });

      ensureIncidenciaOpen(incidencia);

      if (
        !['REPORTADA', 'EN_REVISION'].includes(
          incidencia.estado_incidencia,
        )
      ) {
        throw new AppError(
          'Solo puede editar reportes en estado REPORTADA o EN_REVISION.',
          409,
          'INCIDENCIA_NOT_EDITABLE',
        );
      }

      validarUbicacion({
        ...incidencia.get({ plain: true }),
        ...data,
      });

      await incidencia.update(data, {
        transaction,
      });

      return getIncidenciaDetail(
        incidenciaId,
        transaction,
      );
    },
  );
};

module.exports = updateIncidenciaService;