const { Op } = require('sequelize');
const db = require('../../../database/models');

// Utils
const {
    ESTADOS_CONFLICTO,
    validateProgrammingWindow,
} = require('../utils/programacion-service.utils');

// Modelos
const {
    PersonalOperativo,
    ConductorPerfil,
    Usuario,
    Persona,
    Roles,
    ProgramacionRuta,
    ProgramacionPersonal,
} = db;

const getBusyVehicleIds = async ({
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    excludeProgramacionId =
    null,
}) => {
    const where = {
        fecha_programada,

        estado_programacion: {
            [Op.in]:
                ESTADOS_CONFLICTO,
        },

        hora_inicio_programada: {
            [Op.lt]:
                hora_fin_programada,
        },

        hora_fin_programada: {
            [Op.gt]:
                hora_inicio_programada,
        },
    };

    if (excludeProgramacionId) {
        where.id_programacion = {
            [Op.ne]:
                Number(
                    excludeProgramacionId,
                ),
        };
    }

    const rows =
        await ProgramacionRuta
            .findAll({
                where,

                attributes: [
                    'id_vehiculo',
                ],

                raw: true,
            });

    return [
        ...new Set(
            rows.map(
                (item) =>
                    Number(
                        item.id_vehiculo,
                    ),
            ),
        ),
    ];
};

const getBusyPersonalIds = async ({
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    excludeProgramacionId =
    null,
}) => {
    const programmingWhere = {
        fecha_programada,

        estado_programacion: {
            [Op.in]:
                ESTADOS_CONFLICTO,
        },

        hora_inicio_programada: {
            [Op.lt]:
                hora_fin_programada,
        },

        hora_fin_programada: {
            [Op.gt]:
                hora_inicio_programada,
        },
    };

    if (excludeProgramacionId) {
        programmingWhere
            .id_programacion = {
            [Op.ne]:
                Number(
                    excludeProgramacionId,
                ),
        };
    }

    const rows =
        await ProgramacionPersonal
            .findAll({
                where: {
                    estado_asignacion: {
                        [Op.notIn]: [
                            'RECHAZADO',
                            'RETIRADO',
                        ],
                    },
                },

                include: [
                    {
                        model:
                            ProgramacionRuta,

                        as: 'programacion',

                        where:
                            programmingWhere,

                        attributes: [],

                        required: true,
                    },
                ],

                attributes: [
                    'id_personal',
                ],

                raw: true,
            });

    return [
        ...new Set(
            rows.map(
                (item) =>
                    Number(
                        item.id_personal,
                    ),
            ),
        ),
    ];
};

const getPersonalDisponible = async (
    params,
    role,
) => {
    validateProgrammingWindow(
        params,
    );

    const busyIds =
        await getBusyPersonalIds(
            params,
        );

    const where = {
        estado: true,

        estado_laboral:
            'ACTIVO',
    };

    if (busyIds.length) {
        where.id_personal = {
            [Op.notIn]:
                busyIds,
        };
    }

    const include = [
        {
            model: Usuario,
            as: 'usuario',

            where: {
                estado: true,
            },

            required: true,

            attributes: [
                'id_usuario',
                'username',
                'email_acceso',
            ],

            include: [
                {
                    model: Persona,
                    as: 'persona',

                    where: {
                        estado: true,
                    },

                    required: true,

                    attributes: [
                        'id_persona',
                        'nombres',
                        'apellidos',
                        'numero_documento',
                        'celular',
                        'foto_url',
                    ],
                },
                {
                    model: Roles,
                    as: 'roles',

                    where: {
                        nombre: role,
                        estado: true,
                    },

                    required: true,

                    through: {
                        where: {
                            estado: true,
                        },

                        attributes: [],
                    },

                    attributes: [
                        'id_rol',
                        'nombre',
                    ],
                },
            ],
        },
    ];

    if (role === 'CONDUCTOR') {
        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        include.push({
            model:
                ConductorPerfil,

            as: 'conductor',

            where: {
                estado: true,

                estado_licencia:
                    'VIGENTE',

                fecha_vencimiento_licencia: {
                    [Op.gte]: today,
                },
            },

            required: true,
        });
    }

    return PersonalOperativo
        .findAll({
            where,
            include,

            order: [
                [
                    'codigo_empleado',
                    'ASC',
                ],
            ],
        });
};

module.exports = {
    getBusyVehicleIds,
    getPersonalDisponible,
    getBusyPersonalIds
}