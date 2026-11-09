const { Op } = require('sequelize');
const { randomUUID } = require('node:crypto');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../../jobs/notification-worker');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  sequelize,
} = db;

// Utils
const recalculateProgrammingState = require(
  '../../utils/programacion-personal.utils'
);

const {
  validateId,
  getPersonalForFunction,
  assertPersonalAvailable,
  registerHistory,
} = require('../../utils/programacion-service.utils');

// Auditoria
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');

// ==========================================================
// SERVICE: AGREGAR PERSONAL A LA PROGRAMACIÓN
// ==========================================================

const addProgramacionPersonalService = async (
  idProgramacion,
  {
    id_personal,
    funcion,
    es_principal = false,
    observacion = null,
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  const programmingId = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const personalId = validateId(
    id_personal,
    'identificador del personal',
  );

  const actorId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const normalizedFunction = String(
    funcion || '',
  )
    .trim()
    .toUpperCase();

  if (observacion !== null && typeof observacion !== 'string') {
    throw new AppError(
      'La observación debe ser un texto.',
      400,
      'INVALID_ASSIGNMENT_OBSERVATION',
    );
  }

  const normalizedObservation = observacion?.trim() || null;

  if (normalizedObservation && normalizedObservation.length > 1000) {
    throw new AppError(
      'La observación no puede superar los 1000 caracteres.',
      400,
      'ASSIGNMENT_OBSERVATION_TOO_LONG',
    );
  }

  const transaction = await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 2. Obtener y bloquear programación
    // ------------------------------------------------------

    const programacion =
      await ProgramacionRuta.findByPk(
        programmingId,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        },
      );

    if (!programacion) {
      throw new AppError(
        'La programación no fue encontrada.',
        404,
        'PROGRAMMING_NOT_FOUND',
      );
    }

    if (
      ![
        'PROGRAMADA',
        'ASIGNADA',
      ].includes(
        programacion.estado_programacion,
      )
    ) {
      throw new AppError(
        'Ya no se puede modificar el equipo de esta programación.',
        409,
        'PROGRAMMING_TEAM_CANNOT_BE_UPDATED',
      );
    }

    // ------------------------------------------------------
    // 3. Validar personal y obtener su usuario
    // ------------------------------------------------------

    const personal =
      await getPersonalForFunction({
        id_personal: personalId,
        funcion: normalizedFunction,
        transaction,
      });

    if (personal.id_usuario == null) {
      throw new AppError(
        'El personal no tiene un usuario asociado.',
        409,
        'ASSIGNED_PERSONAL_USER_REQUIRED',
      );
    }

    const recipientId = String(
      personal.id_usuario,
    );

    await assertPersonalAvailable({
      id_personal: personalId,

      fecha_programada:
        programacion.fecha_programada,

      hora_inicio_programada:
        programacion.hora_inicio_programada,

      hora_fin_programada:
        programacion.hora_fin_programada,

      excludeProgramacionId:
        programmingId,

      transaction,
    });

    // ------------------------------------------------------
    // 4. Validar conductor
    // ------------------------------------------------------

    if (
      normalizedFunction === 'CONDUCTOR'
    ) {
      const existingDriver =
        await ProgramacionPersonal.findOne({
          where: {
            id_programacion:
              programmingId,

            funcion:
              'CONDUCTOR',

            estado_asignacion: {
              [Op.notIn]: [
                'RECHAZADO',
                'RETIRADO',
              ],
            },
          },

          transaction,
        });

      if (
        existingDriver &&
        String(existingDriver.id_personal) !==
        String(personalId)
      ) {
        throw new AppError(
          'La programación ya tiene un conductor asignado.',
          409,
          'PROGRAMMING_ALREADY_HAS_DRIVER',
        );
      }

      es_principal = true;
    } else {
      es_principal = false;
    }

    // ------------------------------------------------------
    // 5. Crear o reactivar asignación + auditoria
    // ------------------------------------------------------
    // ------------------------------------------------------
    // 5. Crear o reactivar asignación
    // ------------------------------------------------------

    let assignment = await ProgramacionPersonal.findOne({
      where: {
        id_programacion: programmingId,
        id_personal: personalId,
      },

      paranoid: false,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const isReassignment = Boolean(assignment);

    if (
      assignment &&
      ![
        'RETIRADO',
        'RECHAZADO',
      ].includes(assignment.estado_asignacion)
    ) {
      throw new AppError(
        'El personal ya está asignado a esta programación.',
        409,
        'PERSONAL_ALREADY_ASSIGNED',
      );
    }

    // Capturar ANTES de restaurar, actualizar o crear.
    const auditarAsignacion = prepararAuditoria(
      'ASIGNACION',

      isReassignment
        ? 'REASIGNAR_PERSONAL'
        : 'ASIGNAR_PERSONAL',

      assignment,
    );

    if (assignment) {
      if (assignment.deleted_at && typeof assignment.restore === 'function') {
        await assignment.restore({
          transaction,
        });
      }

      await assignment.update(
        {
          funcion: normalizedFunction,
          es_principal,

          estado_asignacion: 'ASIGNADO',
          fecha_respuesta: null,

          observacion: normalizedObservation,
        },
        {
          transaction,
        },
      );
    } else {
      assignment = await ProgramacionPersonal.create(
        {
          id_programacion: programmingId,
          id_personal: personalId,
          funcion: normalizedFunction,
          es_principal,
          estado_asignacion: 'ASIGNADO',
          fecha_respuesta: null,
          observacion: normalizedObservation,
        },
        {
          transaction,
        },
      );
    }

    // ------------------------------------------------------
    // 6. Recalcular estado
    // ------------------------------------------------------

    const previousState = programacion.estado_programacion;

    const auditarProgramacion = prepararAuditoria(
      'PROGRAMACION',
      'CAMBIAR_ESTADO_POR_ASIGNACION_PERSONAL',
      programacion,
    );

    const newState = await recalculateProgrammingState(
      programacion,
      transaction,
    );

    // ------------------------------------------------------
    // 7. Registrar historial
    // ------------------------------------------------------

    await registerHistory({
      id_programacion: programmingId,
      id_usuario: actorId,
      tipo_evento: 'ASIGNACION_PERSONAL',
      estado_anterior: previousState,
      estado_nuevo: newState,
      datos_nuevos: {
        id_personal: personalId,
        funcion: normalizedFunction,
        es_principal,
        reasignacion: isReassignment,
      },
      observacion: normalizedObservation,

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Encolar aviso al personal agregado
    // ------------------------------------------------------
    const assignmentEventId = randomUUID();

    await enqueueNotification({
      notificacion: {
        tipo_notificacion:
          'ASIGNACION_RUTA',

        titulo:
          isReassignment
            ? 'Nueva asignación a una programación'
            : 'Te asignaron una programación',

        mensaje:
          `Se te asignó como ${normalizedFunction} ` +
          `a una programación de recolección ` +
          `del ${programacion.fecha_programada}, ` +
          `de ${programacion.hora_inicio_programada} ` +
          `a ${programacion.hora_fin_programada}. ` +
          'Revisa el detalle de tu asignación.',

        prioridad:
          'ALTA',

        enviar_interna: true,
        enviar_push: true,

        tipo_entidad:
          'PROGRAMACION',

        id_entidad:
          programmingId,

        datos: {
          id_programacion:
            programmingId,

          id_personal:
            personalId,

          id_ruta:
            programacion.id_ruta,

          funcion:
            normalizedFunction,

          es_principal,

          reasignacion:
            isReassignment,

          fecha_programada:
            programacion.fecha_programada,

          hora_inicio_programada:
            programacion.hora_inicio_programada,

          hora_fin_programada:
            programacion.hora_fin_programada,
        },

        /*
         * Una reasignación posterior necesita una clave
         * diferente, aunque reutilice la misma fila.
         */
        clave_evento:
          `ASIGNACION_PERSONAL:${programmingId}:` +
          `${personalId}:${assignmentEventId}`,

        origen:
          'SISTEMA',
      },

      destino: {
        tipo_destino:
          'USUARIOS',

        destinatarios: [
          recipientId,
        ],
      },

      id_usuario_creacion:
        actorId,

      transaction,
    });

    // ------------------------------------------------------
    // AUDITAR ASIGNACIÓN NUEVA O REASIGNACIÓN
    // ------------------------------------------------------
    await auditarAsignacion(
      assignment,
      transaction,
      {
        motivo: normalizedObservation,
      },
    );

    // ------------------------------------------------------
    // AUDITAR PROGRAMACIÓN SI CAMBIÓ SU ESTADO
    // ------------------------------------------------------
    if (previousState !== newState) {
      await auditarProgramacion(
        programacion,
        transaction,
        {
          motivo: normalizedObservation,
        },
      );
    }

    // ------------------------------------------------------
    // 9. Confirmar asignación y aviso
    // ------------------------------------------------------

    await transaction.commit();

    // El worker despachará la notificación confirmada.
    return assignment;
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = addProgramacionPersonalService;

