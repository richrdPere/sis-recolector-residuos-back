const { Op } = require('sequelize');

const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../jobs/notification-worker');

// Modelos
const {
  Incidencia,
  Usuario,
  Roles,
} = db;

// Validations
const {
  validarCrearIncidencia,
} = require('../validations/incidencia.validations');

// Utils
const {
  validateActor,
  authorizeIncidencia,
  resolveIncidenciaContext,
  getIncidenciaDetail,
} = require('../utils/incidencia-service.utils');

// ==========================================================
// ROLES DESTINATARIOS
// ==========================================================

const ROLES_GESTION_INCIDENCIAS = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
];

// ==========================================================
// TRADUCIR PRIORIDAD AL CONTRATO DE NOTIFICACIONES
// ==========================================================

const getNotificationPriority = (value) => {
  const priorities = {
    BAJA: 'BAJA',
    MEDIA: 'NORMAL',
    NORMAL: 'NORMAL',
    ALTA: 'ALTA',
    CRITICA: 'URGENTE',
    URGENTE: 'URGENTE',
  };

  return priorities[
    String(value || '')
      .trim()
      .toUpperCase()
  ] || 'NORMAL';
};

// ==========================================================
// SERVICE: CREAR INCIDENCIA
// ==========================================================

const createIncidenciaService = async (
  payload,
  metadata,
) => {
  const data =
    validarCrearIncidencia(payload);

  const actor =
    validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      // ----------------------------------------------------
      // 1. Resolver contexto y autorizar
      // ----------------------------------------------------

      const contexto =
        await resolveIncidenciaContext(
          data,
          transaction,
        );

      await authorizeIncidencia(
        'crear',
        actor,
        {
          datos: data,
          contexto,
          transaction,
        },
      );

      // ----------------------------------------------------
      // 2. Crear incidencia
      // ----------------------------------------------------

      const incidencia =
        await Incidencia.create(
          {
            ...data,
            ...contexto.ids,

            id_usuario_reporte:
              actor.id_usuario,

            id_responsable:
              null,

            estado_incidencia:
              'REPORTADA',

            fecha_reporte:
              new Date(),

            fecha_resolucion:
              null,

            detalle_resolucion:
              null,

            estado:
              true,
          },
          {
            transaction,
          },
        );

      // ----------------------------------------------------
      // 3. Obtener gestores activos
      // ----------------------------------------------------

      const gestores =
        await Usuario.findAll({
          where: {
            estado: true,

            // Evitar autonotificación.
            id_usuario: {
              [Op.ne]: actor.id_usuario,
            },
          },

          attributes: [
            'id_usuario',
          ],

          include: [
            {
              model: Roles,
              as: 'roles',

              attributes: [],

              required: true,

              where: {
                estado: true,

                nombre: {
                  [Op.in]:
                    ROLES_GESTION_INCIDENCIAS,
                },
              },

              through: {
                attributes: [],

                where: {
                  estado: true,
                },
              },
            },
          ],

          transaction,
        });

      const recipientIds = [
        ...new Set(
          gestores.map(
            (gestor) =>
              String(gestor.id_usuario),
          ),
        ),
      ];

      // ----------------------------------------------------
      // 4. Encolar aviso de nueva incidencia
      // ----------------------------------------------------

      if (recipientIds.length > 0) {
        const title = String(
          incidencia.titulo ||
          'Incidencia de recolección',
        ).trim();

        const visibleTitle =
          title.length > 180
            ? `${title.slice(0, 177)}...`
            : title;

        await enqueueNotification({
          notificacion: {
            tipo_notificacion:
              'INCIDENCIA_REPORTADA',

            titulo:
              'Nueva incidencia reportada',

            mensaje:
              `Se registró la incidencia ` +
              `#${incidencia.id_incidencia}: ` +
              `${visibleTitle}. ` +
              'Revisa el detalle para gestionar su atención.',

            prioridad:
              getNotificationPriority(
                incidencia.prioridad,
              ),

            enviar_interna: true,
            enviar_push: true,

            tipo_entidad:
              'INCIDENCIA',

            id_entidad:
              incidencia.id_incidencia,

            datos: {
              id_incidencia:
                incidencia.id_incidencia,

              estado_incidencia:
                incidencia.estado_incidencia,

              prioridad_incidencia:
                incidencia.prioridad,

              id_usuario_reporte:
                actor.id_usuario,

              id_recorrido:
                incidencia.id_recorrido,

              id_zona:
                incidencia.id_zona,

              id_ruta:
                incidencia.id_ruta,
            },

            clave_evento:
              'INCIDENCIA_REPORTADA:' +
              incidencia.id_incidencia,

            origen:
              'SISTEMA',
          },

          destino: {
            tipo_destino:
              'USUARIOS',

            destinatarios:
              recipientIds,
          },

          id_usuario_creacion:
            actor.id_usuario,

          transaction,
        });
      }

      // ----------------------------------------------------
      // 5. Devolver detalle
      // ----------------------------------------------------

      return getIncidenciaDetail(
        incidencia.id_incidencia,
        transaction,
      );

      /*
       * Sequelize confirma la transacción cuando este
       * callback termina correctamente.
       *
       * No hacer commit manual ni enviar FCM aquí.
       */
    },
  );
};

module.exports = createIncidenciaService;

// const sequelize = require('../../../config/database');
// const db = require('../../../database/models');

// // Modelos
// const { Incidencia } = db;

// // Validations
// const { validarCrearIncidencia } = require('../validations/incidencia.validations');

// // Utils
// const {
//   validateActor,
//   authorizeIncidencia,
//   resolveIncidenciaContext,
//   getIncidenciaDetail,
// } = require('../utils/incidencia-service.utils');

// // ==========================================================
// // SERVICE: CREAR INCIDENCIA
// // ==========================================================
// const createIncidenciaService = async (
//   payload,
//   metadata,
// ) => {
//   const data = validarCrearIncidencia(payload);
//   const actor = validateActor(metadata);

//   return sequelize.transaction(
//     async (transaction) => {
//       const contexto = await resolveIncidenciaContext(
//         data,
//         transaction,
//       );

//       await authorizeIncidencia('crear', actor, {
//         datos: data,
//         contexto,
//         transaction,
//       });

//       const incidencia = await Incidencia.create(
//         {
//           ...data,
//           ...contexto.ids,

//           id_usuario_reporte: actor.id_usuario,
//           id_responsable: null,

//           estado_incidencia: 'REPORTADA',
//           fecha_reporte: new Date(),

//           fecha_resolucion: null,
//           detalle_resolucion: null,

//           estado: true,
//         },
//         { transaction },
//       );

//       return getIncidenciaDetail(
//         incidencia.id_incidencia,
//         transaction,
//       );
//     },
//   );
// };

// module.exports = createIncidenciaService;