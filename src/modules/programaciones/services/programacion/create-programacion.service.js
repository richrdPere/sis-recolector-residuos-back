const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Service
const getProgramacionByIdService = require("./get-programacion-by-id.service");

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

// Modelos
const {
  ProgramacionRuta,
  ProgramacionPersonal,
  sequelize,
} = db;

// ===============================================
// SERVICE: Crear programacion
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
  validateProgrammingWindow({
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
  });

  const vehicleId =
    validateId(
      id_vehiculo,
      'identificador del vehículo',
    );

  const creatorId =
    validateId(
      id_usuario_creacion,
      'identificador del usuario creador',
    );

  const conductorId =
    validateId(
      id_conductor,
      'identificador del conductor',
    );

  if (
    !Array.isArray(
      recolectores,
    ) ||
    !recolectores.length
  ) {
    throw new AppError(
      'Debe asignar al menos un recolector.',
      400,
      'COLLECTOR_REQUIRED',
    );
  }

  const collectorIds =
    recolectores.map(
      (id) =>
        validateId(
          id,
          'identificador del recolector',
        ),
    );

  const teamIds = [
    conductorId,
    ...collectorIds,
  ];

  if (id_supervisor) {
    teamIds.push(
      validateId(
        id_supervisor,
        'identificador del supervisor',
      ),
    );
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

  const transaction =
    await sequelize.transaction();

  try {
    const {
      version,
    } =
      await validateRouteAndVersion({
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
      id_vehiculo:
        vehicleId,
      fecha_programada,
      hora_inicio_programada,
      hora_fin_programada,
      transaction,
    });

    const team = [
      {
        id_personal:
          conductorId,

        funcion:
          'CONDUCTOR',

        es_principal:
          true,
      },

      ...collectorIds.map(
        (id) => ({
          id_personal: id,
          funcion:
            'RECOLECTOR',

          es_principal:
            false,
        }),
      ),
    ];

    if (id_supervisor) {
      team.push({
        id_personal:
          Number(
            id_supervisor,
          ),

        funcion:
          'SUPERVISOR',

        es_principal:
          false,
      });
    }

    for (
      const member of team
    ) {
      await getPersonalForFunction({
        id_personal:
          member.id_personal,

        funcion:
          member.funcion,

        transaction,
      });

      await assertPersonalAvailable({
        id_personal:
          member.id_personal,

        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,
        transaction,
      });
    }

    const programacion =
      await ProgramacionRuta
        .create(
          {
            id_ruta:
              Number(id_ruta),

            id_ruta_version:
              version
                .id_ruta_version,

            id_vehiculo:
              vehicleId,

            id_usuario_creacion:
              creatorId,

            fecha_programada,
            hora_inicio_programada,
            hora_fin_programada,
            turno,

            estado_programacion:
              'ASIGNADA',

            observacion:
              observacion?.trim() ||
              null,
          },
          {
            transaction,
          },
        );

    for (
      const member of team
    ) {
      await ProgramacionPersonal
        .create(
          {
            id_programacion:
              programacion
                .id_programacion,

            id_personal:
              member.id_personal,

            funcion:
              member.funcion,

            es_principal:
              member.es_principal,

            estado_asignacion:
              'ASIGNADO',
          },
          {
            transaction,
          },
        );
    }

    await registerHistory({
      id_programacion:
        programacion
          .id_programacion,

      id_usuario:
        creatorId,

      tipo_evento:
        'CREACION',

      estado_nuevo:
        'ASIGNADA',

      datos_nuevos: {
        id_ruta:
          programacion.id_ruta,

        id_ruta_version:
          programacion
            .id_ruta_version,

        id_vehiculo:
          programacion
            .id_vehiculo,

        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,
        equipo: team,
      },

      observacion:
        'Programación creada con vehículo y equipo asignado.',

      ip,
      user_agent,
      transaction,
    });

    await transaction.commit();

    return getProgramacionByIdService(
      programacion
        .id_programacion,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = createProgramacionService;