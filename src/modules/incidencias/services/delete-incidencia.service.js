const sequelize = require('../../../config/database');

const { IncidenciaArchivo } = require('../../../database/models');

// Validations
const { validarId } = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: ELIMINACIÓN LÓGICA DE INCIDENCIA
// ==========================================================

const deleteIncidenciaService = async (
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
        true,
      );

      await authorizeIncidencia('eliminar', actor, {
        incidencia,
        transaction,
      });

      await IncidenciaArchivo.update(
        { estado: false },
        {
          where: {
            id_incidencia: incidenciaId,
          },

          transaction,
        },
      );

      await IncidenciaArchivo.destroy({
        where: {
          id_incidencia: incidenciaId,
        },

        transaction,
      });

      await incidencia.update(
        { estado: false },
        { transaction },
      );

      await incidencia.destroy({
        transaction,
      });

      return {
        id_incidencia: incidenciaId,
        eliminado: true,
      };
    },
  );
};

module.exports = deleteIncidenciaService;