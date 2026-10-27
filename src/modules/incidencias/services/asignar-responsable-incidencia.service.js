const AppError = require('../../../utils/app-error');
const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Modelos
const { Usuario } = db;

// Validations
const {
  validarId,
  validarAsignarResponsable,
} = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  findEnabledReference,
  ensureIncidenciaOpen,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: ASIGNAR O RETIRAR RESPONSABLE
// ==========================================================

const asignarResponsableIncidenciaService = async (
  id,
  payload,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const data = validarAsignarResponsable(payload);
  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      const responsable = data.id_responsable
        ? await findEnabledReference(
          Usuario,
          data.id_responsable,
          'El usuario responsable',
          transaction,
        )
        : null;

      await authorizeIncidencia(
        'asignar_responsable',
        actor,
        {
          incidencia,
          datos: data,
          responsable,
          transaction,
        },
      );

      ensureIncidenciaOpen(incidencia);

      if (
        !responsable &&
        incidencia.estado_incidencia === 'EN_ATENCION'
      ) {
        throw new AppError(
          'Una incidencia en atención debe conservar un responsable.',
          409,
          'RESPONSABLE_REQUIRED',
        );
      }

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

module.exports = asignarResponsableIncidenciaService;