const AppError = require('../../../utils/app-error');
const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Modelos
const { IncidenciaArchivo } = db;

// Validations
const { validarId } = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  ensureIncidenciaOpen,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: ELIMINACIÓN LÓGICA DE EVIDENCIA
// ==========================================================

const deleteIncidenciaArchivoService = async (
  id,
  idArchivo,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  const archivoId = validarId(
    idArchivo,
    'id_incidencia_archivo',
  );

  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      const archivo = await IncidenciaArchivo.findOne({
        where: {
          id_incidencia: incidenciaId,
          id_incidencia_archivo: archivoId,
          estado: true,
        },

        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!archivo) {
        throw new AppError(
          'El archivo no existe en esta incidencia.',
          404,
          'INCIDENCIA_ARCHIVO_NOT_FOUND',
        );
      }

      await authorizeIncidencia(
        'eliminar_archivo',
        actor,
        {
          incidencia,
          archivo,
          transaction,
        },
      );

      ensureIncidenciaOpen(incidencia);

      await archivo.update(
        { estado: false },
        { transaction },
      );

      await archivo.destroy({
        transaction,
      });

      return {
        id_incidencia: incidenciaId,
        id_incidencia_archivo: archivoId,
        eliminado: true,
      };
    },
  );
};

module.exports = deleteIncidenciaArchivoService;