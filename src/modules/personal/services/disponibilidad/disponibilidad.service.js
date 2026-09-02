const { Op } = require('sequelize');
const db = require('../../../../database/models');
const AppError = require('../../../../utils/app-error');

// Modelos
const {
    PersonalOperativo,
    ConductorPerfil,
    Usuario,
    Persona,
    Roles,
} = db;


const getDisponiblesByRole = async ({
    rol,
    includeConductor = false,
}) => {
    const include = [
        {
            model: Usuario,
            as: 'usuario',

            attributes: [
                'id_usuario',
                'username',
                'email_acceso',
                'estado',
            ],

            where: {
                estado: true,
            },

            required: true,

            include: [
                {
                    model: Persona,
                    as: 'persona',

                    attributes: [
                        'id_persona',
                        'nombres',
                        'apellidos',
                        'numero_documento',
                        'celular',
                        'foto_url',
                        'estado',
                    ],

                    where: {
                        estado: true,
                    },

                    required: true,
                },
                {
                    model: Roles,
                    as: 'roles',

                    attributes: [
                        'id_rol',
                        'nombre',
                    ],

                    where: {
                        nombre: rol,
                        estado: true,
                    },

                    through: {
                        where: {
                            estado: true,
                        },

                        attributes: [],
                    },

                    required: true,
                },
            ],
        },
    ];

    if (includeConductor) {
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
            where: {
                estado: true,
                estado_laboral:
                    'ACTIVO',
            },

            include,
            distinct: true,

            order: [
                [
                    'codigo_empleado',
                    'ASC',
                ],
            ],
        });
};

const getConductoresDisponiblesService = async () => {
    return getDisponiblesByRole({
        rol: 'CONDUCTOR',
        includeConductor: true,
    });
};

const getRecolectoresDisponiblesService = async () => {
    return getDisponiblesByRole({
        rol: 'RECOLECTOR',
        includeConductor: false,
    });
};

const getPersonalByRolService = async (rol) => {
    const roleName =
        String(rol || '')
            .trim()
            .toUpperCase();

    const rolesPermitidos = [
        'CONDUCTOR',
        'RECOLECTOR',
        'SUPERVISOR',
        'OPERADOR',
    ];

    if (
        !rolesPermitidos.includes(
            roleName,
        )
    ) {
        throw new AppError(
            'El rol proporcionado no es un rol operativo válido.',
            400,
            'INVALID_OPERATIONAL_ROLE',
        );
    }

    return getDisponiblesByRole({
        rol: roleName,

        includeConductor:
            roleName ===
            'CONDUCTOR',
    });
};

module.exports = {
    getConductoresDisponiblesService,
    getRecolectoresDisponiblesService,
    getPersonalByRolService,
};