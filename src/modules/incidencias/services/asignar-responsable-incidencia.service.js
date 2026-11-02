const { randomUUID } = require('node:crypto');

const AppError = require('../../../utils/app-error');
const sequelize = require('../../../config/database');
const db = require('../../../database/models');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../jobs/notification-worker');

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

  const data =
    validarAsignarResponsable(payload);

  const actor =
    validateActor(metadata);

  return sequelize.transaction(
    async (transaction) => {
      // ----------------------------------------------------
      // 1. Obtener y bloquear incidencia
      // ----------------------------------------------------

      const incidencia =
        await findIncidenciaOrFail(
          incidenciaId,
          transaction,
          true,
        );

      // ----------------------------------------------------
      // 2. Validar nuevo responsable
      // ----------------------------------------------------

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
        incidencia.estado_incidencia ===
        'EN_ATENCION'
      ) {
        throw new AppError(
          'Una incidencia en atención debe conservar un responsable.',
          409,
          'RESPONSABLE_REQUIRED',
        );
      }

      // ----------------------------------------------------
      // 3. Conservar responsable anterior
      // ----------------------------------------------------

      const previousResponsibleId =
        incidencia.id_responsable == null
          ? null
          : String(
            incidencia.id_responsable,
          );

      // ----------------------------------------------------
      // 4. Actualizar incidencia
      // ----------------------------------------------------

      await incidencia.update(
        data,
        {
          transaction,
        },
      );

      const newResponsibleId =
        incidencia.id_responsable == null
          ? null
          : String(
            incidencia.id_responsable,
          );

      const responsibleChanged =
        previousResponsibleId !==
        newResponsibleId;

      // ----------------------------------------------------
      // 5. Notificar solo cuando cambia el responsable
      // ----------------------------------------------------

      if (responsibleChanged) {
        /*
         * Una incidencia puede asignarse, retirarse
         * y volver a asignarse al mismo usuario.
         */
        const assignmentEventId =
          randomUUID();

        const actorId =
          String(actor.id_usuario);

        const title = String(
          incidencia.titulo ||
          'Incidencia de recolección',
        ).trim();

        const visibleTitle =
          title.length > 180
            ? `${title.slice(0, 177)}...`
            : title;

        // --------------------------------------------------
        // Aviso al nuevo responsable
        // --------------------------------------------------

        if (
          newResponsibleId !== null &&
          newResponsibleId !== actorId
        ) {
          await enqueueNotification({
            notificacion: {
              tipo_notificacion:
                'INCIDENCIA_ASIGNADA',

              titulo:
                'Se te asignó una incidencia',

              mensaje:
                `Se te asignó la atención de la incidencia ` +
                `#${incidenciaId}: ${visibleTitle}. ` +
                'Revisa el detalle para gestionar su atención.',

              prioridad:
                'ALTA',

              enviar_interna: true,
              enviar_push: true,

              tipo_entidad:
                'INCIDENCIA',

              id_entidad:
                incidenciaId,

              datos: {
                id_incidencia:
                  incidenciaId,

                id_responsable:
                  newResponsibleId,

                estado_incidencia:
                  incidencia.estado_incidencia,

                accion:
                  'ASIGNACION_RESPONSABLE',
              },

              clave_evento:
                `INCIDENCIA_ASIGNADA:${incidenciaId}:` +
                assignmentEventId,

              origen:
                'SISTEMA',
            },

            destino: {
              tipo_destino:
                'USUARIOS',

              destinatarios: [
                newResponsibleId,
              ],
            },

            id_usuario_creacion:
              actor.id_usuario,

            transaction,
          });
        }

        // --------------------------------------------------
        // Aviso al responsable anterior
        // --------------------------------------------------

        if (
          previousResponsibleId !== null &&
          previousResponsibleId !== actorId
        ) {
          await enqueueNotification({
            notificacion: {
              tipo_notificacion:
                'INCIDENCIA_RESPONSABLE_RETIRADO',

              titulo:
                'Responsabilidad de incidencia retirada',

              mensaje:
                `Ya no eres responsable de la incidencia ` +
                `#${incidenciaId}: ${visibleTitle}.`,

              prioridad:
                'NORMAL',

              enviar_interna: true,
              enviar_push: true,

              tipo_entidad:
                'INCIDENCIA',

              id_entidad:
                incidenciaId,

              datos: {
                id_incidencia:
                  incidenciaId,

                id_responsable_anterior:
                  previousResponsibleId,

                accion:
                  'RETIRO_RESPONSABLE',
              },

              clave_evento:
                `INCIDENCIA_RESPONSABLE_RETIRADO:` +
                `${incidenciaId}:${assignmentEventId}`,

              origen:
                'SISTEMA',
            },

            destino: {
              tipo_destino:
                'USUARIOS',

              destinatarios: [
                previousResponsibleId,
              ],
            },

            id_usuario_creacion:
              actor.id_usuario,

            transaction,
          });
        }
      }

      // ----------------------------------------------------
      // 6. Devolver detalle
      // ----------------------------------------------------

      return getIncidenciaDetail(
        incidenciaId,
        transaction,
      );

      /*
       * Sequelize confirma la actualización y los avisos
       * al terminar correctamente este callback.
       *
       * El worker los despacha después del commit.
       */
    },
  );
};

module.exports = asignarResponsableIncidenciaService;

// const AppError = require('../../../utils/app-error');
// const sequelize = require('../../../config/database');
// const db = require('../../../database/models');

// // Modelos
// const { Usuario } = db;

// // Validations
// const {
//   validarId,
//   validarAsignarResponsable,
// } = require('../validations/incidencia.validations');

// // Utils
// const {
//   validateActor,
//   authorizeIncidencia,
//   findIncidenciaOrFail,
//   findEnabledReference,
//   ensureIncidenciaOpen,
//   getIncidenciaDetail,
// } = require('../utils/incidencia-service.utils');

// // ==========================================================
// // SERVICE: ASIGNAR O RETIRAR RESPONSABLE
// // ==========================================================

// const asignarResponsableIncidenciaService = async (
//   id,
//   payload,
//   metadata,
// ) => {
//   const incidenciaId = validarId(
//     id,
//     'id_incidencia',
//   );

//   const data = validarAsignarResponsable(payload);
//   const actor = validateActor(metadata);

//   return sequelize.transaction(
//     async (transaction) => {
//       const incidencia = await findIncidenciaOrFail(
//         incidenciaId,
//         transaction,
//         true,
//       );

//       const responsable = data.id_responsable
//         ? await findEnabledReference(
//           Usuario,
//           data.id_responsable,
//           'El usuario responsable',
//           transaction,
//         )
//         : null;

//       await authorizeIncidencia(
//         'asignar_responsable',
//         actor,
//         {
//           incidencia,
//           datos: data,
//           responsable,
//           transaction,
//         },
//   );

//   ensureIncidenciaOpen(incidencia);

//   if (
//     !responsable &&
//     incidencia.estado_incidencia === 'EN_ATENCION'
//   ) {
//     throw new AppError(
//       'Una incidencia en atención debe conservar un responsable.',
//       409,
//       'RESPONSABLE_REQUIRED',
//     );
//   }

//   await incidencia.update(data, {
//     transaction,
//   });

//   return getIncidenciaDetail(
//     incidenciaId,
//     transaction,
//   );
// },
//   );
// };

// module.exports = asignarResponsableIncidenciaService;