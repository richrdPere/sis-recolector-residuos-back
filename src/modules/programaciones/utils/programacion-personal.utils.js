const { Op } = require('sequelize');
const db = require('../../../database/models');

// Modelos
const { ProgramacionPersonal } = db;

const recalculateProgrammingState = async (
    programacion,
    transaction,
) => {
    const assignments =
        await ProgramacionPersonal
            .findAll({
                where: {
                    id_programacion:
                        programacion
                            .id_programacion,

                    estado_asignacion: {
                        [Op.notIn]: [
                            'RECHAZADO',
                            'RETIRADO',
                        ],
                    },
                },

                transaction,
            });

    const hasDriver =
        assignments.some(
            (item) =>
                item.funcion ===
                'CONDUCTOR' &&
                item.es_principal,
        );

    const hasCollector =
        assignments.some(
            (item) =>
                item.funcion ===
                'RECOLECTOR',
        );

    const newState =
        hasDriver &&
            hasCollector
            ? 'ASIGNADA'
            : 'PROGRAMADA';

    if (
        programacion
            .estado_programacion !==
        newState
    ) {
        await programacion.update(
            {
                estado_programacion:
                    newState,
            },
            {
                transaction,
            },
        );
    }

    return newState;
};

module.exports = recalculateProgrammingState;