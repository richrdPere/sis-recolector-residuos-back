'use strict';

// Integra cambios de modelos con Socket.IO.
// Una emisión fallida no revierte una operación confirmada.

const db = require('../../database/models');

// Emitters
const tracking = require('../emitters/tracking.emitter');
const recorrido = require('../emitters/recorrido.emitter');
const programacion = require('../emitters/programacion.emitter');

// ==========================================================
// INSTALAR HOOKS
// ==========================================================

function install(io) {
  const removals = [];
  const jobs = new Map();

  let closed = false;

  // ========================================================
  // PROGRAMAR PUBLICACIÓN DESPUÉS DEL COMMIT
  // ========================================================

  const schedule = (
    key,
    action,
    options = {},
  ) => {
    const enqueue = () => {
      if (closed) return;

      /*
       * Agrupa cambios de la misma entidad.
       * Si hay una publicación ejecutándose, conserva
       * una actualización posterior con el estado reciente.
       */
      const existing = jobs.get(key);

      if (existing) {
        existing.again = action;
        return;
      }

      const job = {
        again: action,
      };

      jobs.set(key, job);

      setImmediate(async () => {
        try {
          while (job.again && !closed) {
            const publish = job.again;

            job.again = null;

            try {
              await publish();
            } catch (error) {
              console.error(
                '[socket:publish]',
                key,
                error.name,
              );
            }
          }
        } finally {
          jobs.delete(key);
        }
      });
    };

    if (options.transaction) {
      options.transaction.afterCommit(
        enqueue,
      );
    } else {
      enqueue();
    }
  };

  // ========================================================
  // REGISTRAR HOOK Y SU LIMPIEZA
  // ========================================================

  const registerHook = (
    model,
    type,
    name,
    handler,
  ) => {
    model.addHook(
      type,
      name,
      handler,
    );

    removals.push(() => {
      model.removeHook(
        type,
        name,
      );
    });
  };

  // ========================================================
  // PUBLICAR CAMBIOS DE UNA ENTIDAD
  // ========================================================

  const onSave = (
    model,
    field,
    label,
    emitter,
  ) => {
    registerHook(
      model,
      'afterSave',
      `socket:${label}`,
      (
        row,
        options = {},
      ) => {
        const value = row[field];

        if (value == null) return;

        schedule(
          `${label}:${value}`,
          () => emitter(io, value),
          options,
        );
      },
    );
  };

  // ========================================================
  // TRACKING
  // ========================================================

  onSave(
    db.RecorridoUltimaUbicacion,
    'id_recorrido',
    'tracking',
    tracking,
  );

  // ========================================================
  // RECORRIDOS
  // ========================================================

  onSave(
    db.Recorrido,
    'id_recorrido',
    'recorrido',
    recorrido,
  );

  // ========================================================
  // PROGRAMACIONES
  // ========================================================

  /*
   * Ambas tablas publican el estado de la programación.
   * Comparten etiqueta para agrupar cambios del mismo ID.
   */
  onSave(
    db.ProgramacionRuta,
    'id_programacion',
    'programacion',
    programacion,
  );

  registerHook(
    db.ProgramacionPersonal,
    'afterSave',
    'socket:asignacion',
    (
      row,
      options = {},
    ) => {
      const idProgramacion =
        row.id_programacion;

      if (idProgramacion == null) return;

      schedule(
        `programacion:${idProgramacion}`,
        () => programacion(
          io,
          idProgramacion,
        ),
        options,
      );
    },
  );

  // ========================================================
  // NOTIFICACIONES
  // ========================================================

  /*
   * No registrar hooks sobre Notificacion ni
   * NotificacionUsuario.
   *
   * Creación:
   *   dispatchNotificationService
   *   -> notificacion:nueva
   *
   * Lectura y archivo:
   *   Sus controladores emiten exclusivamente al
   *   usuario autenticado.
   *
   * Actualizar estado_push o estado_notificacion
   * no debe generar avisos nuevos ni eventos de lectura.
   */

  // ========================================================
  // DESINSTALAR
  // ========================================================

  return () => {
    if (closed) return;

    closed = true;

    for (const remove of removals) {
      remove();
    }

    jobs.clear();
  };
}

module.exports = {
  install,
};


// // Integra REST y socket sin duplicar las operaciones de negocio.
// // Una emisión fallida nunca revierte ni hace fallar un commit exitoso.
// const db = require('../../database/models');
// const tracking = require('../emitters/tracking.emitter');
// const recorrido = require('../emitters/recorrido.emitter');
// const programacion = require('../emitters/programacion.emitter');
// const notificacion = require('../emitters/notificacion.emitter');

// function install(io) {
//   const removals = [], jobs = new Map();

//   let closed = false;

//   const schedule = (key, action, options = {}) => {
//     const enqueue = () => {
//       if (closed) return;
//       // Coalescer por entidad, sin cola ilimitada de puntos GPS.
//       const existing = jobs.get(key);
//       if (existing) {
//         existing.again = action;
//         return;
//       }

//       const job = { again: action };
//       jobs.set(key, job);

//       setImmediate(async () => {
//         try {
//           while (job.again && !closed) {
//             const fn = job.again;
//             job.again = null;
//             try {
//               await fn();
//             } catch (error) {
//               console.error('[socket:publish]', key, error.name);
//             }
//           }
//         } finally { jobs.delete(key); }
//       });
//     };
//     if (options.transaction) options.transaction.afterCommit(enqueue);
//     else enqueue();
//   };
//   const hook = (model, type, name, fn) => {
//     model.addHook(type, name, fn); removals.push(() => model.removeHook(type, name));
//   };
//   const onSave = (model, field, label, fn) => {
//     hook(model, 'afterSave', `socket:${label}`, (row, options) => {
//       const value = row[field]; schedule(`${label}:${value}`, () => fn(io, value), options);
//     });
//   };
  
//   onSave(db.RecorridoUltimaUbicacion, 'id_recorrido', 'tracking', tracking);
//   onSave(db.Recorrido, 'id_recorrido', 'recorrido', recorrido);
//   onSave(db.ProgramacionRuta, 'id_programacion', 'programacion', programacion);
//   onSave(db.ProgramacionPersonal, 'id_programacion', 'asignacion', programacion);
//   onSave(db.Notificacion, 'id_notificacion', 'notificacion', notificacion);
//   onSave(db.NotificacionUsuario, 'id_notificacion', 'lectura', (server, value) => notificacion(server, value, true));
//   hook(db.NotificacionUsuario, 'afterBulkCreate', 'socket:destinatarios', (rows, options) => {
//     for (const value of new Set(rows.map((row) => row.id_notificacion))) schedule(`notificacion:${value}`, () => notificacion(io, value), options);
//   });
//   hook(db.NotificacionUsuario, 'afterBulkUpdate', 'socket:lectura-masiva', (options) => {
//     const userId = options.where?.id_usuario;
//     if (typeof userId === 'string' || typeof userId === 'number') {
//       schedule(`lecturas:${userId}`, () => {
//         const { emitAuthorized } = require('./delivery.service');
//         const R = require('../constants/socket-rooms.constants');
//         const E = require('../constants/socket-events.constants');
//         return emitAuthorized(io, [R.usuario(userId)], E.NOTIFICATION_READ, { refrescar: true });
//       }, options);
//     }
//   });
//   return () => { closed = true; removals.forEach((remove) => remove()); };
// }
// module.exports = { install };
