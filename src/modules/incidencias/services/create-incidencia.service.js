const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Modelos
const { Incidencia } = db;

// Validations
const { validarCrearIncidencia } = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  resolveIncidenciaContext,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// SERVICE: CREAR INCIDENCIA
// ==========================================================
const createIncidenciaService = async (
  payload,
  metadata,
) => {
  const data = validarCrearIncidencia(payload);
  const actor = validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      const contexto = await resolveIncidenciaContext(
        data,
        transaction,
      );

      await authorizeIncidencia('crear', actor, {
        datos: data,
        contexto,
        transaction,
      });

      const incidencia = await Incidencia.create(
        {
          ...data,
          ...contexto.ids,

          id_usuario_reporte: actor.id_usuario,
          id_responsable: null,

          estado_incidencia: 'REPORTADA',
          fecha_reporte: new Date(),

          fecha_resolucion: null,
          detalle_resolucion: null,

          estado: true,
        },
        { transaction },
      );

      return getIncidenciaDetail(
        incidencia.id_incidencia,
        transaction,
      );
    },
  );
};

module.exports = createIncidenciaService;