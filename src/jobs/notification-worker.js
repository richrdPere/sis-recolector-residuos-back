'use strict';

const { createHash } = require('node:crypto');

// Database
const db = require('../database/models');

// Utils
const AppError = require('../utils/app-error');

// Services
const processPendingNotificationsService = require('../modules/notificaciones/services/motor/process-pending-notifications.service');
const resolveRecipientsService = require('../modules/notificaciones/services/motor/resolve-recipients.service');
const createNotificationService = require('../modules/notificaciones/services/notificaciones-internas/create-notification.service');

// ==========================================================
// ESTADO DEL WORKER EN ESTE PROCESO
// ==========================================================

let active = false;
let timer = null;
let running = null;
let stopping = false;
let cursor = null;

let config = {
  intervalMs: 15000,
  limit: 20,
  maxLotesPorCiclo: 3,
  maxIntentos: 3,
};

// ==========================================================
// VALIDAR CONFIGURACIÓN NUMÉRICA
// ==========================================================

function integerOption(
  value,
  fallback,
  min,
  max,
  name,
) {
  const parsed = value == null
    ? fallback
    : Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    throw new AppError(
      `La opción ${name} no es válida.`,
      400,
      'INVALID_WORKER_OPTION',
    );
  }

  return parsed;
}

// ==========================================================
// EJECUTAR UN CICLO
// ==========================================================
//
// Dos llamadas simultáneas en este proceso comparten
// la ejecución existente.
//

function runNotificationWorkerOnce() {
  if (stopping) {
    return Promise.resolve({
      omitido: true,
      motivo: 'DETENIENDO',
    });
  }

  if (running) {
    return running;
  }

  running = (async () => {
    const summary = {
      lotes: 0,
      revisadas: 0,
      procesadas: 0,
      omitidas: 0,
      errores: 0,
      proximidad: {
        creadas: 0,
        errores: 0,
      },
    };

    // Encolar los avisos de proximidad antes de procesar los pendientes.
    try {
      // Carga diferida porque el servicio ciudadano usa
      // enqueueNotification de este mismo módulo.
      const evaluarProximidadRecorridos = require(
        '../modules/notificaciones/services/ciudadanos/evaluar-proximidad-recorrido.service',
      );

      summary.proximidad = await evaluarProximidadRecorridos();
      summary.errores += summary.proximidad.errores;
    } catch (error) {
      summary.proximidad.errores++;
      summary.errores++;

      console.error(
        '[proximidad:worker]',
        error.code || error.name,
      );
    }

    for (let index = 0; index < config.maxLotesPorCiclo; index++) {
      if (stopping) break;

      const result = await processPendingNotificationsService({
        limit: config.limit,
        despues_de: cursor,
        incluir_reintentos: true,
        maxIntentos: config.maxIntentos,
      });

      cursor = result.proximo_cursor ?? null;

      summary.lotes++;
      summary.revisadas += result.revisadas;
      summary.procesadas += result.procesadas;
      summary.omitidas += result.omitidas;
      summary.errores += result.errores;

      // El siguiente ciclo inicia una nueva vuelta al terminar esta.
      if (cursor === null) {
        break;
      }
    }

    return {
      ...summary,
      proximo_cursor: cursor,
    };
  })().finally(() => {
    running = null;
  });

  return running;
}

// ==========================================================
// EJECUCIÓN PERIÓDICA
// ==========================================================

async function tick() {
  timer = null;

  if (!active) return;

  try {
    const result = await runNotificationWorkerOnce();

    if (
      result.procesadas ||
      result.errores
    ) {
      console.log(
        '[notification-worker]',
        result,
      );
    }
  } catch (error) {
    console.error(
      '[notification-worker]',
      error.code || error.name,
    );
  } finally {
    /*
     * Programar después de terminar evita superponer
     * ciclos cuando Firebase o MySQL responden lento.
     */
    if (active) {
      timer = setTimeout(
        tick,
        config.intervalMs,
      );

      timer.unref?.();
    }
  }
}

// ==========================================================
// INICIAR WORKER
// ==========================================================

function startNotificationWorker(
  options = {},
) {
  if (stopping) {
    throw new AppError(
      'El worker se está deteniendo.',
      409,
      'WORKER_BUSY',
    );
  }

  if (active) {
    return {
      iniciado: true,
      ya_iniciado: true,
    };
  }

  if (running) {
    throw new AppError(
      'Hay un ciclo manual en ejecución.',
      409,
      'WORKER_BUSY',
    );
  }

  const enabled =
    options.enabled ??
    (
      process.env
        .NOTIFICATION_WORKER_ENABLED !==
      'false'
    );

  if (typeof enabled !== 'boolean') {
    throw new AppError(
      'enabled debe ser boolean.',
      400,
      'INVALID_WORKER_OPTION',
    );
  }

  if (!enabled) {
    return {
      iniciado: false,
      motivo: 'DESHABILITADO',
    };
  }

  config = {
    intervalMs: integerOption(
      options.intervalMs ??
      process.env
        .NOTIFICATION_WORKER_INTERVAL_MS,
      15000,
      1000,
      3600000,
      'intervalMs',
    ),

    limit: integerOption(
      options.limit ??
      process.env
        .NOTIFICATION_WORKER_BATCH_SIZE,
      20,
      1,
      100,
      'limit',
    ),

    maxLotesPorCiclo: integerOption(
      options.maxLotesPorCiclo ??
      process.env
        .NOTIFICATION_WORKER_MAX_BATCHES,
      3,
      1,
      20,
      'maxLotesPorCiclo',
    ),

    maxIntentos: integerOption(
      options.maxIntentos ??
      process.env
        .NOTIFICATION_MAX_ATTEMPTS,
      3,
      1,
      10,
      'maxIntentos',
    ),
  };

  cursor = null;
  active = true;

  // Primera ejecución sin esperar el intervalo completo.
  timer = setTimeout(tick, 0);
  timer.unref?.();

  return {
    iniciado: true,
    ...config,
  };
}

// ==========================================================
// DETENER WORKER
// ==========================================================
//
// Evita nuevos ciclos y espera al que esté ejecutándose.
// No interrumpe una petición FCM que ya comenzó.
//

async function stopNotificationWorker() {
  active = false;
  stopping = true;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  try {
    if (running) {
      await running;
    }
  } finally {
    stopping = false;
    cursor = null;
  }
}

// ==========================================================
// ENCOLAR NOTIFICACIONES USANDO EL RESOLVER
// ==========================================================
//
// Se ejecuta desde servicios de negocio.
//
// Si recibe una transacción externa, participa en ella:
// no hace commit ni envía mensajes.
//
// Si no recibe transacción, crea una propia.
//
// Firebase y Socket.IO se procesan posteriormente
// mediante el worker.
//

async function enqueueNotification({
  notificacion,
  destino,
  id_usuario_creacion = null,
  transaction: externalTransaction = null,
} = {}) {
  if (
    !notificacion ||
    !destino ||
    typeof notificacion.clave_evento !==
    'string' ||
    !notificacion.clave_evento.trim() ||
    notificacion.clave_evento.length > 150
  ) {
    throw new AppError(
      'Debe proporcionar notificacion, destino y una clave_evento de hasta 150 caracteres.',
      400,
      'INVALID_ENQUEUE_REQUEST',
    );
  }

  const baseKey =
    notificacion.clave_evento.trim();

  const execute = async (transaction) => {
    // ------------------------------------------------------
    // 1. Resolver destinatarios, preferencias y fechas
    // ------------------------------------------------------

    const resolved =
      await resolveRecipientsService({
        ...destino,

        enviar_interna:
          notificacion.enviar_interna ??
          true,

        enviar_push:
          notificacion.enviar_push ??
          true,

        fecha_programada:
          notificacion.fecha_programada ??
          null,

        fecha_expiracion:
          notificacion.fecha_expiracion ??
          null,

        transaction,
      });

    const summary = {
      creadas: 0,
      duplicadas: 0,
      excluidos: resolved.excluidos,
      total_destinatarios:
        resolved.total_destinatarios,
      notificaciones: [],
    };

    // ------------------------------------------------------
    // 2. Crear los avisos
    // ------------------------------------------------------

    for (const group of resolved.grupos) {
      for (
        const userId of group.destinatarios
      ) {
        /*
         * Una notificación por usuario permite conservar
         * una clave estable aunque cambie el grupo de
         * canales o el orden de los destinatarios.
         */
        const eventKey =
          'MOTOR:' +
          createHash('sha256')
            .update(
              JSON.stringify([
                baseKey,
                String(userId),
              ]),
            )
            .digest('hex');

        const result = await createNotificationService(
          {
            ...notificacion,

            enviar_interna:
              group.enviar_interna,

            enviar_push:
              group.enviar_push,

            fecha_programada:
              group.fecha_programada,

            destinatarios: [
              userId,
            ],

            clave_evento:
              eventKey,
          },
          {
            id_usuario_creacion,
            transaction,
          },
        );

        if (result.creada) {
          summary.creadas++;
        } else {
          summary.duplicadas++;
        }

        summary.notificaciones.push({
          id_notificacion: String(
            result.notificacion
              .id_notificacion,
          ),

          creada: result.creada,
          duplicada: result.duplicada,
        });
      }
    }

    return summary;
  };

  if (externalTransaction) {
    return execute(externalTransaction);
  }

  return db.sequelize.transaction(execute);
}

// ==========================================================
// EXPORTACIONES
// ==========================================================

module.exports = {
  startNotificationWorker,
  stopNotificationWorker,
  runNotificationWorkerOnce,
  enqueueNotification,
};