const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Modelos
const { IncidenciaArchivo } = db;

// Validations
const { validarId } = require('../validations/incidencia.validations');

// Utils
const { serializarArchivo } = require('../utils/incidencia.utils');

const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: LISTAR EVIDENCIAS
// ==========================================================

const getIncidenciaArchivosService = async (
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

      await authorizeIncidencia(
        'ver_archivos',
        actor,
        {
          incidencia,
          transaction,
        },
      );

      const archivos =
        await IncidenciaArchivo.findAll({
          where: {
            id_incidencia: incidenciaId,
            estado: true,
          },

          order: [
            ['created_at', 'ASC'],
            ['id_incidencia_archivo', 'ASC'],
          ],

          transaction,
        });

      return archivos.map(
        serializarArchivo,
      );
    },
  );
};

module.exports = getIncidenciaArchivosService;