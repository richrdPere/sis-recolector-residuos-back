const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Modelos
const { IncidenciaArchivo } = db;

// Validations
const {
  validarId,
  validarArchivosIncidencia,
} = require('../validations/incidencia.validations');

// Utils
const { serializarArchivo } = require('../utils/incidencia.utils');

const {
  validateActor,
  authorizeIncidencia,
  findIncidenciaOrFail,
  ensureIncidenciaOpen,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: AGREGAR EVIDENCIAS
// ==========================================================

const agregarIncidenciaArchivosService = async (
  id,
  metadatos,
  metadata,
) => {
  const incidenciaId = validarId(
    id,
    'id_incidencia',
  );

  // Límites por llamada y por archivo, respectivamente.
  const archivos = validarArchivosIncidencia(
    metadatos,
    {
      maxArchivos: 10,
      maxBytes: 50 * 1024 * 1024,
    },
  );

  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const incidencia = await findIncidenciaOrFail(
        incidenciaId,
        transaction,
        true,
      );

      await authorizeIncidencia(
        'agregar_archivos',
        actor,
        {
          incidencia,
          archivos,
          transaction,
        },
      );

      ensureIncidenciaOpen(incidencia);

      const resultados = [];

      for (const archivo of archivos) {
        const registro = await IncidenciaArchivo.create(
          {
            ...archivo,

            id_incidencia: incidenciaId,
            id_usuario_carga: actor.id_usuario,

            estado: true,
          },
          { transaction },
        );

        resultados.push(
          serializarArchivo(registro),
        );
      }

      return resultados;
    },
  );
};

module.exports = agregarIncidenciaArchivosService;