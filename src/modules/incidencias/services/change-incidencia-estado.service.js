const AppError = require('../../../utils/app-error');
const sequelize = require('../../../config/database');

// Validations
const {
  validarId,
  validarCambiarEstadoIncidencia,
} = require('../validations/incidencia.validations');

// Utils
const {
  validarTransicion,
  esTerminal,
} = require('../utils/incidencia.utils');

const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  ensureIncidenciaEnabled,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: CAMBIAR ESTADO DE ATENCIÓN
// ==========================================================

const changeIncidenciaEstadoService = async (
  id,
  payload,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const data = validarCambiarEstadoIncidencia(payload);
  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      await authorizeIncidencia(
        'cambiar_estado',
        actor,
        {
          incidencia,
          datos: data,
          transaction,
        },
      );

      ensureIncidenciaEnabled(incidencia);

      validarTransicion(
        incidencia.estado_incidencia,
        data.estado_incidencia,
      );

      const requiereResponsable = [
        'EN_ATENCION',
        'RESUELTA',
      ].includes(data.estado_incidencia);

      if (
        requiereResponsable &&
        !incidencia.id_responsable
      ) {
        throw new AppError(
          'Debe asignar un responsable antes de atender o resolver.',
          409,
          'RESPONSABLE_REQUIRED',
        );
      }

      const terminal = esTerminal(
        data.estado_incidencia,
      );

      await incidencia.update(
        {
          estado_incidencia:
            data.estado_incidencia,

          detalle_resolucion: terminal
            ? data.detalle_resolucion
            : null,

          fecha_resolucion: terminal
            ? new Date()
            : null,
        },
        { transaction },
      );

      return getIncidenciaDetail(
        incidenciaId,
        transaction,
      );
    },
  );
};

module.exports = changeIncidenciaEstadoService;