const { Op } = require('sequelize');
const { randomUUID } = require('node:crypto');

const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Services
const getProgramacionByIdService = require('./get-programacion-by-id.service');
const crearAvisoCiudadano = require('../../../notificaciones/services/ciudadanos/crear-aviso-ciudadano.service');

// Motor de notificaciones
const {
  enqueueNotification,
} = require('../../../../jobs/notification-worker');

// Utils
const {
  validateId,
  validateProgrammingWindow,
  validateRouteAndVersion,
  validateVehicle,
  assertVehicleAvailable,
  assertPersonalAvailable,
  registerHistory,
} = require('../../utils/programacion-service.utils');

// Modelos
const {
  ProgramacionRuta,
  PersonalOperativo,
  sequelize,
} = db;

// ==========================================================
// COMPARAR VALORES SIN DIFERENCIAS DE FORMATO
// ==========================================================

const normalizeComparableValue = (
  field,
  value,
) => {
  if (value == null) return null;

  if (field.startsWith('id_')) {
    return String(value);
  }

  if (
    field === 'hora_inicio_programada' ||
    field === 'hora_fin_programada'
  ) {
    const time = String(value)
      .split('.')[0];

    return time.length === 5
      ? `${time}:00`
      : time;
  }

  return String(value);
};

// ==========================================================
// SERVICE: ACTUALIZAR PROGRAMACIÓN
// ==========================================================

const updateProgramacionService = async (
  idProgramacion,
  payload,
  {
    id_usuario,
    ip = null,
    user_agent = null,
  },
) => {
  const id = validateId(
    idProgramacion,
    'identificador de la programación',
  );

  const actorId = validateId(
    id_usuario,
    'identificador del usuario',
  );

  const transaction =
    await sequelize.transaction();

  try {
    // ------------------------------------------------------
    // 1. Obtener y bloquear programación
    // ------------------------------------------------------

    const programacion =
      await ProgramacionRuta.findByPk(
        id,
        {
          include: [
            {
              association:
                'personal_asignado',

              where: {
                estado_asignacion: {
                  [Op.notIn]: [
                    'RECHAZADO',
                    'RETIRADO',
                  ],
                },
              },

              required: false,
            },
          ],

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
        'La programación ya no puede modificarse.',
        409,
        'PROGRAMMING_CANNOT_BE_UPDATED',
      );
    }

    // ------------------------------------------------------
    // 2. Conservar datos anteriores
    // ------------------------------------------------------

    const previousData = {
      id_ruta:
        programacion.id_ruta,

      id_ruta_version:
        programacion.id_ruta_version,

      id_vehiculo:
        programacion.id_vehiculo,

      fecha_programada:
        programacion.fecha_programada,

      hora_inicio_programada:
        programacion.hora_inicio_programada,

      hora_fin_programada:
        programacion.hora_fin_programada,

      turno:
        programacion.turno,

      observacion:
        programacion.observacion,
    };

    const previousState =
      programacion.estado_programacion;

    // ------------------------------------------------------
    // 3. Construir datos finales
    // ------------------------------------------------------

    const finalData = {
      id_ruta:
        payload.id_ruta ??
        programacion.id_ruta,

      id_ruta_version:
        payload.id_ruta_version ??
        (
          payload.id_ruta
            ? null
            : programacion.id_ruta_version
        ),

      id_vehiculo:
        payload.id_vehiculo ??
        programacion.id_vehiculo,

      fecha_programada:
        payload.fecha_programada ??
        programacion.fecha_programada,

      hora_inicio_programada:
        payload.hora_inicio_programada ??
        programacion.hora_inicio_programada,

      hora_fin_programada:
        payload.hora_fin_programada ??
        programacion.hora_fin_programada,

      turno:
        payload.turno !== undefined
          ? payload.turno
          : programacion.turno,

      observacion:
        payload.observacion !== undefined
          ? payload.observacion?.trim() || null
          : programacion.observacion,
    };

    validateProgrammingWindow(finalData);

    // ------------------------------------------------------
    // 4. Validar ruta, versión y vehículo
    // ------------------------------------------------------

    const { version } =
      await validateRouteAndVersion({
        ...finalData,
        transaction,
      });

    const vehicleId = validateId(
      finalData.id_vehiculo,
      'identificador del vehículo',
    );

    await validateVehicle(
      vehicleId,
      transaction,
    );

    await assertVehicleAvailable({
      id_vehiculo: vehicleId,

      fecha_programada:
        finalData.fecha_programada,

      hora_inicio_programada:
        finalData.hora_inicio_programada,

      hora_fin_programada:
        finalData.hora_fin_programada,

      excludeProgramacionId: id,

      transaction,
    });

    // ------------------------------------------------------
    // 5. Validar disponibilidad del equipo
    // ------------------------------------------------------

    const assignments =
      programacion.personal_asignado || [];

    for (const assignment of assignments) {
      await assertPersonalAvailable({
        id_personal:
          assignment.id_personal,

        fecha_programada:
          finalData.fecha_programada,

        hora_inicio_programada:
          finalData.hora_inicio_programada,

        hora_fin_programada:
          finalData.hora_fin_programada,

        excludeProgramacionId: id,

        transaction,
      });
    }

    // Valores realmente utilizados en la actualización.
    const updatedData = {
      ...finalData,

      id_ruta_version:
        version.id_ruta_version,

      id_vehiculo:
        vehicleId,
    };

    // ------------------------------------------------------
    // 6. Identificar cambios reales
    // ------------------------------------------------------

    const changedFields =
      Object.keys(previousData).filter(
        (field) =>
          normalizeComparableValue(
            field,
            previousData[field],
          ) !==
          normalizeComparableValue(
            field,
            updatedData[field],
          ),
      );

    // ------------------------------------------------------
    // 7. Actualizar programación
    // ------------------------------------------------------

    await programacion.update(
      updatedData,
      {
        transaction,
      },
    );

    const historial = await registerHistory({
      id_programacion: id,
      id_usuario: actorId,

      tipo_evento:
        'ACTUALIZACION',

      estado_anterior:
        previousState,

      estado_nuevo:
        programacion.estado_programacion,

      datos_anteriores:
        previousData,

      datos_nuevos:
        updatedData,

      ip,
      user_agent,
      transaction,
    });

    // ------------------------------------------------------
    // 8. Notificar cambios al equipo asignado
    // ------------------------------------------------------

    if (
      changedFields.length > 0 &&
      assignments.length > 0
    ) {
      const personalIds = [
        ...new Set(
          assignments.map(
            (assignment) =>
              assignment.id_personal,
          ),
        ),
      ];

      /*
       * Convertir IDs de personal en IDs de usuarios.
       * El resolver comprobará que las cuentas estén activas.
       */
      const personal =
        await PersonalOperativo.findAll({
          where: {
            id_personal: {
              [Op.in]: personalIds,
            },
          },

          attributes: [
            'id_personal',
            'id_usuario',
          ],

          transaction,
        });

      const recipientIds = [
        ...new Set(
          personal
            .filter(
              (member) =>
                member.id_usuario != null,
            )
            .map(
              (member) =>
                String(member.id_usuario),
            ),
        ),
      ];

      if (recipientIds.length > 0) {
        const scheduleChanged =
          changedFields.some(
            (field) =>
              [
                'fecha_programada',
                'hora_inicio_programada',
                'hora_fin_programada',
              ].includes(field),
          );

        const routeChanged =
          changedFields.some(
            (field) =>
              [
                'id_ruta',
                'id_ruta_version',
              ].includes(field),
          );

        const vehicleChanged =
          changedFields.includes(
            'id_vehiculo',
          );

        const changesDescription = [];

        if (scheduleChanged) {
          changesDescription.push(
            'la fecha o el horario',
          );
        }

        if (routeChanged) {
          changesDescription.push(
            'la ruta o su versión',
          );
        }

        if (vehicleChanged) {
          changesDescription.push(
            'el vehículo',
          );
        }

        if (
          changedFields.includes('turno')
        ) {
          changesDescription.push(
            'el turno',
          );
        }

        if (
          changedFields.includes('observacion')
        ) {
          changesDescription.push(
            'las observaciones',
          );
        }

        /*
         * Cada actualización efectiva es un evento nuevo.
         * Permite notificar también una modificación que
         * revierta cambios de una actualización anterior.
         */
        const updateEventId =
          randomUUID();

        await enqueueNotification({
          notificacion: {
            tipo_notificacion:
              'PROGRAMACION_ACTUALIZADA',

            titulo:
              'Tu programación fue actualizada',

            mensaje:
              `Se actualizó ${changesDescription.join(', ')} ` +
              `de tu programación de recolección. ` +
              `Fecha: ${updatedData.fecha_programada}, ` +
              `de ${updatedData.hora_inicio_programada} ` +
              `a ${updatedData.hora_fin_programada}. ` +
              'Revisa el detalle antes de iniciar el servicio.',

            prioridad:
              scheduleChanged ||
                routeChanged ||
                vehicleChanged
                ? 'ALTA'
                : 'NORMAL',

            enviar_interna: true,
            enviar_push: true,

            tipo_entidad:
              'PROGRAMACION',

            id_entidad:
              programacion.id_programacion,

            datos: {
              id_programacion:
                programacion.id_programacion,

              campos_modificados:
                changedFields,

              id_ruta:
                updatedData.id_ruta,

              id_ruta_version:
                updatedData.id_ruta_version,

              id_vehiculo:
                updatedData.id_vehiculo,

              fecha_programada:
                updatedData.fecha_programada,

              hora_inicio_programada:
                updatedData.hora_inicio_programada,

              hora_fin_programada:
                updatedData.hora_fin_programada,
            },

            clave_evento:
              `ACTUALIZACION:PROGRAMACION:${id}:` +
              updateEventId,

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
            actorId,

          transaction,
        });
      }
    }

    const cambioRuta = changedFields.includes('id_ruta');
    const cambioTrazado = changedFields.includes('id_ruta_version');

    const cambioHorario = [
      'fecha_programada',
      'hora_inicio_programada',
      'hora_fin_programada',
    ].some((campo) => changedFields.includes(campo));

    if (cambioRuta || cambioTrazado || cambioHorario) {
      const evento =
        cambioRuta || cambioTrazado ? 'CAMBIO_RUTA' : 'CAMBIO_HORARIO';

      const horarioNuevo =
        `Fecha: ${updatedData.fecha_programada}, ` +
        `de ${updatedData.hora_inicio_programada} ` +
        `a ${updatedData.hora_fin_programada}.`;

      const datos = {
        id_programacion: id,
        id_historial: historial.id_historial,
        fecha_programada: updatedData.fecha_programada,
        hora_inicio_programada: updatedData.hora_inicio_programada,
        hora_fin_programada: updatedData.hora_fin_programada,
      };

      if (cambioRuta) {
        await crearAvisoCiudadano({
          evento,
          idRuta: previousData.id_ruta,
          tipoEntidad: 'PROGRAMACION',
          idEntidad: id,
          claveEvento:
            `CAMBIO_RUTA:PROGRAMACION:${id}:HISTORIAL:${historial.id_historial}:ANTERIOR`,
          titulo: 'Cambio en el servicio de tu ruta',
          mensaje:
            'El servicio previsto para tu ruta fue reasignado. ' +
            'Consulta el calendario de tu domicilio para ver los servicios disponibles.',
          datos: {
            id_programacion: id,
            id_historial: historial.id_historial,
          },
          idUsuarioCreacion: actorId,
          transaction,
        });
      }

      await crearAvisoCiudadano({
        evento,
        idRuta: updatedData.id_ruta,
        tipoEntidad: 'PROGRAMACION',
        idEntidad: id,
        claveEvento:
          `${evento}:PROGRAMACION:${id}:HISTORIAL:${historial.id_historial}:VIGENTE`,
        titulo:
          evento === 'CAMBIO_RUTA'
            ? 'Cambio de ruta de recolección'
            : 'Cambio de horario de recolección',
        mensaje:
          evento === 'CAMBIO_RUTA'
            ? `Se actualizó el recorrido del servicio. ${horarioNuevo}`
            : `Se modificó el horario de tu servicio. ${horarioNuevo}`,
        datos,
        idUsuarioCreacion: actorId,
        transaction,
      });
    }

    // ------------------------------------------------------
    // 9. Confirmar actualización y notificaciones
    // ------------------------------------------------------

    await transaction.commit();

    // El worker despachará los avisos confirmados.
    try {
      return await getProgramacionByIdService(id);
    } catch (error) {
      return {
        id_programacion: id,

        mensaje:
          'La programación fue actualizada, pero no se pudo recuperar su detalle.',
      };
    }
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = updateProgramacionService;
// const { Op } = require('sequelize');
// const db = require('../../../../database/models');
// const AppError = require('../../../../utils/app-error');

// // Service
// const getProgramacionByIdService = require("./get-programacion-by-id.service");

// // Utils
// const {
//     // Validaciones
//     validateId,
//     validateProgrammingWindow,

//     // Utilidades con acceso a base de datos
//     validateRouteAndVersion,
//     validateVehicle,
//     assertVehicleAvailable,
//     assertPersonalAvailable,
//     registerHistory,
// } = require("../../utils/programacion-service.utils");

// // Modelos
// const {
//     ProgramacionRuta,
//     sequelize,
// } = db;

// // ===============================================
// // SERVICE: Actializar programacion
// // ===============================================
// const updateProgramacionService = async (
//     idProgramacion,
//     payload,
//     {
//         id_usuario,
//         ip = null,
//         user_agent = null,
//     },
// ) => {
//     const id = validateId(
//         idProgramacion,
//         'identificador de la programación',
//     );

//     const transaction =
//         await sequelize.transaction();

//     try {
//         const programacion =
//             await ProgramacionRuta
//                 .findByPk(id, {
//                     include: [
//                         {
//                             association:
//                                 'personal_asignado',

//                             where: {
//                                 estado_asignacion: {
//                                     [Op.notIn]: [
//                                         'RECHAZADO',
//                                         'RETIRADO',
//                                     ],
//                                 },
//                             },

//                             required: false,
//                         },
//                     ],

//                     transaction,
//                     lock:
//                         transaction.LOCK
//                             .UPDATE,
//                 });

//         if (!programacion) {
//             throw new AppError(
//                 'La programación no fue encontrada.',
//                 404,
//                 'PROGRAMMING_NOT_FOUND',
//             );
//         }

//         if (
//             ![
//                 'PROGRAMADA',
//                 'ASIGNADA',
//             ].includes(
//                 programacion
//                     .estado_programacion,
//             )
//         ) {
//             throw new AppError(
//                 'La programación ya no puede modificarse.',
//                 409,
//                 'PROGRAMMING_CANNOT_BE_UPDATED',
//             );
//         }

//         const previousData = {
//             id_ruta:
//                 programacion.id_ruta,

//             id_ruta_version:
//                 programacion
//                     .id_ruta_version,

//             id_vehiculo:
//                 programacion
//                     .id_vehiculo,

//             fecha_programada:
//                 programacion
//                     .fecha_programada,

//             hora_inicio_programada:
//                 programacion
//                     .hora_inicio_programada,

//             hora_fin_programada:
//                 programacion
//                     .hora_fin_programada,

//             turno:
//                 programacion.turno,

//             observacion:
//                 programacion.observacion,
//         };

//         const finalData = {
//             id_ruta:
//                 payload.id_ruta ??
//                 programacion.id_ruta,

//             id_ruta_version:
//                 payload
//                     .id_ruta_version ??
//                 (
//                     payload.id_ruta
//                         ? null
//                         : programacion
//                             .id_ruta_version
//                 ),

//             id_vehiculo:
//                 payload.id_vehiculo ??
//                 programacion
//                     .id_vehiculo,

//             fecha_programada:
//                 payload
//                     .fecha_programada ??
//                 programacion
//                     .fecha_programada,

//             hora_inicio_programada:
//                 payload
//                     .hora_inicio_programada ??
//                 programacion
//                     .hora_inicio_programada,

//             hora_fin_programada:
//                 payload
//                     .hora_fin_programada ??
//                 programacion
//                     .hora_fin_programada,

//             turno:
//                 payload.turno !==
//                     undefined
//                     ? payload.turno
//                     : programacion.turno,

//             observacion:
//                 payload.observacion !==
//                     undefined
//                     ? payload
//                         .observacion
//                         ?.trim() ||
//                     null
//                     : programacion
//                         .observacion,
//         };

//         validateProgrammingWindow(
//             finalData,
//         );

//         const {
//             version,
//         } =
//             await validateRouteAndVersion({
//                 ...finalData,
//                 transaction,
//             });

//         const vehicleId =
//             validateId(
//                 finalData.id_vehiculo,
//                 'identificador del vehículo',
//             );

//         await validateVehicle(
//             vehicleId,
//             transaction,
//         );

//         await assertVehicleAvailable({
//             id_vehiculo: vehicleId,
//             fecha_programada: finalData.fecha_programada,
//             hora_inicio_programada: finalData.hora_inicio_programada,
//             hora_fin_programada: finalData.hora_fin_programada,
//             excludeProgramacionId: id,
//             transaction,
//         });

//         for (const assignment of programacion.personal_asignado || []) {
//             await assertPersonalAvailable({
//                 id_personal: assignment.id_personal,
//                 fecha_programada: finalData.fecha_programada,
//                 hora_inicio_programada: finalData.hora_inicio_programada,
//                 hora_fin_programada: finalData.hora_fin_programada,
//                 excludeProgramacionId: id,

//                 transaction,
//             });
//         }

//         await programacion.update(
//             {
//                 ...finalData,
//                 id_ruta_version: version.id_ruta_version,
//                 id_vehiculo: vehicleId,
//             },
//             {
//                 transaction,
//             },
//         );

//         await registerHistory({
//             id_programacion: id,
//             id_usuario,
//             tipo_evento: 'ACTUALIZACION',
//             estado_anterior: programacion.estado_programacion,
//             estado_nuevo: programacion.estado_programacion,
//             datos_anteriores: previousData,
//             datos_nuevos: finalData,
//             ip,
//             user_agent,
//             transaction,
//         });

//         await transaction.commit();

//         return getProgramacionByIdService(id);
//     } catch (error) {
//         if (!transaction.finished) {
//             await transaction.rollback();
//         }

//         throw error;
//     }
// };

// module.exports = updateProgramacionService;