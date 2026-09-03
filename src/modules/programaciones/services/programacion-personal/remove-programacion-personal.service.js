const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
    ProgramacionRuta,
    ProgramacionPersonal,
    sequelize,
} = db;

// Utils
const recalculateProgrammingState = require("../../utils/programacion-personal.utils");

const {
    validateId,
    registerHistory,
} = require('../../utils/programacion-service.utils');

// ===============================================
// SERVICE: Remover personal a la programacion
// ===============================================
const removeProgramacionPersonalService = async (
    idProgramacion,
    idAsignacion,
    {
        observacion = null,
        id_usuario,
        ip = null,
        user_agent = null,
    },
) => {
    const programmingId =
        validateId(
            idProgramacion,
            'identificador de la programación',
        );

    const assignmentId =
        validateId(
            idAsignacion,
            'identificador de la asignación',
        );

    const transaction =
        await sequelize.transaction();

    try {
        const programacion =
            await ProgramacionRuta
                .findByPk(
                    programmingId,
                    {
                        transaction,
                        lock:
                            transaction.LOCK
                                .UPDATE,
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
                programacion
                    .estado_programacion,
            )
        ) {
            throw new AppError(
                'Ya no se puede retirar personal de esta programación.',
                409,
                'PROGRAMMING_TEAM_CANNOT_BE_UPDATED',
            );
        }

        const assignment =
            await ProgramacionPersonal
                .findOne({
                    where: {
                        id_programacion:
                            programmingId,

                        id_programacion_personal:
                            assignmentId,
                    },

                    transaction,
                });

        if (!assignment) {
            throw new AppError(
                'La asignación de personal no fue encontrada.',
                404,
                'PERSONAL_ASSIGNMENT_NOT_FOUND',
            );
        }

        if (
            assignment
                .estado_asignacion ===
            'RETIRADO'
        ) {
            throw new AppError(
                'El personal ya fue retirado.',
                409,
                'PERSONAL_ALREADY_REMOVED',
            );
        }

        const previousState =
            programacion
                .estado_programacion;

        await assignment.update(
            {
                estado_asignacion:
                    'RETIRADO',

                observacion:
                    observacion?.trim() ||
                    'Personal retirado de la programación.',
            },
            {
                transaction,
            },
        );

        const newState =
            await recalculateProgrammingState(
                programacion,
                transaction,
            );

        await registerHistory({
            id_programacion:
                programmingId,

            id_usuario,

            tipo_evento:
                'RETIRO_PERSONAL',

            estado_anterior:
                previousState,

            estado_nuevo:
                newState,

            datos_anteriores: {
                id_personal:
                    assignment
                        .id_personal,

                funcion:
                    assignment.funcion,
            },

            observacion:
                assignment.observacion,

            ip,
            user_agent,
            transaction,
        });

        await transaction.commit();

        return assignment;
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
};

module.exports = removeProgramacionPersonalService;