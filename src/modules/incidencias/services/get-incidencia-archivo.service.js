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
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: OBTENER ARCHIVO PARA DESCARGA
// ==========================================================

const getIncidenciaArchivoService = async (
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
      );

      const archivo = await IncidenciaArchivo.findOne({
        where: {
          id_incidencia: incidenciaId,
          id_incidencia_archivo: archivoId,
          estado: true,
        },

        transaction,
      });

      if (!archivo) {
        throw new AppError(
          'El archivo no existe en esta incidencia.',
          404,
          'INCIDENCIA_ARCHIVO_NOT_FOUND',
        );
      }

      await authorizeIncidencia(
        'descargar_archivo',
        actor,
        {
          incidencia,
          archivo,
          transaction,
        },
      );

      // Datos internos para servir el archivo o generar
      // una URL temporal. No devolverlos completos al cliente.
      return archivo.get({ plain: true });
    },
  );
};

module.exports = getIncidenciaArchivoService;