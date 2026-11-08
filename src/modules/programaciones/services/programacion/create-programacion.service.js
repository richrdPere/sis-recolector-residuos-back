const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Services
const getProgramacionByIdService = require("./get-programacion-by-id.service");

// Motor de notificaciones
const { enqueueNotification } = require('../../../../jobs/notification-worker');

// Utils 
const {
  // Validaciones
  validateId,
  validateProgrammingWindow,

  // Utilidades con acceso a base de datos
  validateRouteAndVersion,
  validateVehicle,
  assertVehicleAvailable,
  getPersonalForFunction,
  assertPersonalAvailable,
  registerHistory,
} = require("../../utils/programacion-service.utils");

// Auditoria
const { prepararAuditoria } = require('../../../auditoria/utils/auditar-cambio.utils');

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  sequelize,
} = db;

// ===============================================
// SERVICE: CREAR PROGRAMACIÓN
// ===============================================
const createProgramacionService = async ({
  id_ruta,
  id_ruta_version = null,
  id_vehiculo,
  id_conductor,
  recolectores = [],
  id_supervisor = null,
  fecha_programada,
  hora_inicio_programada,
  hora_fin_programada,
  turno = null,
  observacion = null,
  id_usuario_creacion,
  ip = null,
  user_agent = null,
}) => {
  // --------------------------------------------------------
  // 1. Validaciones
  // --------------------------------------------------------

  validateProgrammingWindow({
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
  });

  const vehicleId = validateId(
    id_vehiculo,
    'identificador del vehículo',
  );

  const creatorId = validateId(
    id_usuario_creacion,
    'identificador del usuario creador',
  );

  const conductorId = validateId(
    id_conductor,
    'identificador del conductor',
  );

  const supervisorId = id_supervisor == null
    ? null
    : validateId(
      id_supervisor,
      'identificador del supervisor',
    );

  if (
    !Array.isArray(recolectores) ||
    !recolectores.length
  ) {
    throw new AppError(
      'Debe asignar al menos un recolector.',
      400,
      'COLLECTOR_REQUIRED',
    );
  }

  const collectorIds = recolectores.map(
    (id) => validateId(
      id,
      'identificador del recolector',
    ),
  );

  const teamIds = [
    conductorId,
    ...collectorIds,
  ];

  if (supervisorId !== null) {
    teamIds.push(supervisorId);
  }

  if (
    new Set(teamIds).size !==
    teamIds.length
  ) {
    throw new AppError(
      'Una misma persona no puede ocupar más de una función en la programación.',
      400,
      'DUPLICATE_PROGRAMMING_PERSONAL',
    );
  }

  const transaction = await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 2. Validar ruta, versión y vehículo
    // ------------------------------------------------------

    const { version } = await validateRouteAndVersion({
      id_ruta,
      id_ruta_version,
      fecha_programada,
      hora_inicio_programada,
      hora_fin_programada,
      transaction,
    });

    await validateVehicle(
      vehicleId,
      transaction,
    );

    await assertVehicleAvailable({
      id_vehiculo: vehicleId,
      fecha_programada,
      hora_inicio_programada,
      hora_fin_programada,
      transaction,
    });

    // ------------------------------------------------------
    // 3. Construir equipo
    // ------------------------------------------------------

    const team = [
      {
        id_personal: conductorId,
        funcion: 'CONDUCTOR',
        es_principal: true,
      },

      ...collectorIds.map((id) => ({
        id_personal: id,
        funcion: 'RECOLECTOR',
        es_principal: false,
      })),
    ];

    if (supervisorId !== null) {
      team.push({
        id_personal: supervisorId,
        funcion: 'SUPERVISOR',
        es_principal: false,
      });
    }

    // IDs de usuarios, no IDs de personal.
    const assignedUserIds = new Set();

    // ------------------------------------------------------
    // 4. Validar personal y obtener destinatarios
    // ------------------------------------------------------

    for (const member of team) {
      const personal =
        await getPersonalForFunction({
          id_personal: member.id_personal,
          funcion: member.funcion,
          transaction,
        });

      await assertPersonalAvailable({
        id_personal: member.id_personal,
        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,
        transaction,
      });

      /*
       * PersonalOperativo.id_usuario identifica la cuenta
       * que recibirá el aviso en web y móvil.
       */
      if (personal.id_usuario == null) {
        throw new AppError(
          'El personal asignado no tiene un usuario asociado.',
          409,
          'ASSIGNED_PERSONAL_USER_REQUIRED',
        );
      }

      assignedUserIds.add(
        String(personal.id_usuario),
      );
    }

    // ------------------------------------------------------
    // 5. Crear programación
    // ------------------------------------------------------
    const auditarProgramacion = prepararAuditoria('PROGRAMACION', 'CREAR');

    const programacion = await ProgramacionRuta.create(
      {
        id_ruta: Number(id_ruta),

        id_ruta_version: version.id_ruta_version,

        id_vehiculo: vehicleId,

        id_usuario_creacion: creatorId,

        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,
        turno,

        estado_programacion: 'ASIGNADA',

        observacion:
          observacion?.trim() || null,
      },
      {
        transaction,
      },
    );

    // ------------------------------------------------------
    // 6. Registrar asignaciones y su auditoría
    // ------------------------------------------------------

    for (const member of team) {
      const auditarAsignacion = prepararAuditoria(
        'ASIGNACION',
        'ASIGNAR_PERSONAL',
      );

      const asignacion = await ProgramacionPersonal.create(
        {
          id_programacion: programacion.id_programacion,
          id_personal: member.id_personal,
          funcion: member.funcion,
          es_principal: member.es_principal,
          estado_asignacion: 'ASIGNADO',
        },
        {
          transaction,
        },
      );

      await auditarAsignacion(
        asignacion,
        transaction,
      );
    }

    // ------------------------------------------------------
    // 7. Registrar historial
    // ------------------------------------------------------

    await registerHistory({
      id_programacion: programacion.id_programacion,
      id_usuario: creatorId,
      tipo_evento: 'CREACION',
      estado_nuevo: 'ASIGNADA',
      datos_nuevos: {
        id_ruta: programacion.id_ruta,
        id_ruta_version: programacion.id_ruta_version,
        id_vehiculo: programacion.id_vehiculo,
        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,

        equipo: team,
      },

      observacion: 'Programación creada con vehículo y equipo asignado.',

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Encolar avisos al equipo asignado
    // ------------------------------------------------------

    await enqueueNotification({
      notificacion: {
        tipo_notificacion: 'ASIGNACION_RUTA',

        titulo: 'Nueva programación asignada',

        mensaje:
          `Se te asignó una programación de recolección ` +
          `para el ${fecha_programada}, ` +
          `de ${hora_inicio_programada} ` +
          `a ${hora_fin_programada}.`,

        prioridad: 'ALTA',

        enviar_interna: true,
        enviar_push: true,

        tipo_entidad: 'PROGRAMACION',

        id_entidad:
          programacion.id_programacion,

        datos: {
          id_programacion:
            programacion.id_programacion,

          id_ruta:
            programacion.id_ruta,

          id_ruta_version:
            programacion.id_ruta_version,

          fecha_programada,
          hora_inicio_programada,
          hora_fin_programada,
        },

        clave_evento:
          `ASIGNACION_RUTA:PROGRAMACION:` +
          programacion.id_programacion,

        // Aviso generado automáticamente por el sistema.
        origen: 'SISTEMA',
      },

      destino: {
        tipo_destino: 'USUARIOS',

        destinatarios: [
          ...assignedUserIds,
        ],
      },

      id_usuario_creacion: creatorId,

      // La notificación participa en esta transacción.
      transaction,
    });

    // Auditoría de creación de la programación.
    await auditarProgramacion(
      programacion,
      transaction,
    );

    // ------------------------------------------------------
    // 9. Confirmar operación completa
    // ------------------------------------------------------

    await transaction.commit();

    /*
     * El worker encontrará las notificaciones confirmadas.
     * No llamar aquí al emitter ni enviar Firebase directamente.
     */

    try {
      return await getProgramacionByIdService(
        programacion.id_programacion,
      );
    } catch (error) {
      return {
        id_programacion:
          programacion.id_programacion,

        mensaje:
          'La programación fue creada, pero no se pudo recuperar su detalle.',
      };
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};


module.exports = createProgramacionService;