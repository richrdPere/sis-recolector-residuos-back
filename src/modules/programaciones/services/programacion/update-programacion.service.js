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
    assertPersonalAvailable,
    registerHistory,
} = require("../../utils/programacion-service.utils");

// Modelos
const {
    ProgramacionRuta,
    sequelize,
} = db;

// ===============================================
// SERVICE: Actializar programacion
// ===============================================
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

    const transaction =
        await sequelize.transaction();

    try {
        const programacion =
            await ProgramacionRuta
                .findByPk(id, {
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
                        transaction.LOCK
                            .UPDATE,
                });

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
                programacion
                    .estado_programacion,
            )
        ) {
            throw new AppError(
                'La programación ya no puede modificarse.',
                409,
                'PROGRAMMING_CANNOT_BE_UPDATED',
            );
        }

        const previousData = {
            id_ruta:
                programacion.id_ruta,

            id_ruta_version:
                programacion
                    .id_ruta_version,

            id_vehiculo:
                programacion
                    .id_vehiculo,

            fecha_programada:
                programacion
                    .fecha_programada,

            hora_inicio_programada:
                programacion
                    .hora_inicio_programada,

            hora_fin_programada:
                programacion
                    .hora_fin_programada,

            turno:
                programacion.turno,

            observacion:
                programacion.observacion,
        };

        const finalData = {
            id_ruta:
                payload.id_ruta ??
                programacion.id_ruta,

            id_ruta_version:
                payload
                    .id_ruta_version ??
                (
                    payload.id_ruta
                        ? null
                        : programacion
                            .id_ruta_version
                ),

            id_vehiculo:
                payload.id_vehiculo ??
                programacion
                    .id_vehiculo,

            fecha_programada:
                payload
                    .fecha_programada ??
                programacion
                    .fecha_programada,

            hora_inicio_programada:
                payload
                    .hora_inicio_programada ??
                programacion
                    .hora_inicio_programada,

            hora_fin_programada:
                payload
                    .hora_fin_programada ??
                programacion
                    .hora_fin_programada,

            turno:
                payload.turno !==
                    undefined
                    ? payload.turno
                    : programacion.turno,

            observacion:
                payload.observacion !==
                    undefined
                    ? payload
                        .observacion
                        ?.trim() ||
                    null
                    : programacion
                        .observacion,
        };

        validateProgrammingWindow(
            finalData,
        );

        const {
            version,
        } =
            await validateRouteAndVersion({
                ...finalData,
                transaction,
            });

        const vehicleId =
            validateId(
                finalData.id_vehiculo,
                'identificador del vehículo',
            );

        await validateVehicle(
            vehicleId,
            transaction,
        );

        await assertVehicleAvailable({
            id_vehiculo:
                vehicleId,

            fecha_programada:
                finalData
                    .fecha_programada,

            hora_inicio_programada:
                finalData
                    .hora_inicio_programada,

            hora_fin_programada:
                finalData
                    .hora_fin_programada,

            excludeProgramacionId:
                id,

            transaction,
        });

        for (
            const assignment of
            programacion
                .personal_asignado ||
            []
        ) {
            await assertPersonalAvailable({
                id_personal:
                    assignment
                        .id_personal,

                fecha_programada:
                    finalData
                        .fecha_programada,

                hora_inicio_programada:
                    finalData
                        .hora_inicio_programada,

                hora_fin_programada:
                    finalData
                        .hora_fin_programada,

                excludeProgramacionId:
                    id,

                transaction,
            });
        }

        await programacion.update(
            {
                ...finalData,

                id_ruta_version:
                    version
                        .id_ruta_version,

                id_vehiculo:
                    vehicleId,
            },
            {
                transaction,
            },
        );

        await registerHistory({
            id_programacion: id,
            id_usuario,
            tipo_evento:
                'ACTUALIZACION',

            estado_anterior:
                programacion
                    .estado_programacion,

            estado_nuevo:
                programacion
                    .estado_programacion,

            datos_anteriores:
                previousData,

            datos_nuevos:
                finalData,

            ip,
            user_agent,
            transaction,
        });

        await transaction.commit();

        return getProgramacionByIdService(id);
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
};

module.exports = updateProgramacionService;