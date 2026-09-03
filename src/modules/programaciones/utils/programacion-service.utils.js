const { Op } = require('sequelize');
const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const {
    ESTADOS_CONFLICTO,
    FUNCIONES_PERSONAL,
    DIAS_SEMANA,
    ESTADOS_VEHICULO_NO_OPERATIVO,
    ESTADOS_ASIGNACION_SIN_CONFLICTO,
} = require('./programacion.constans');

const {
    validateId,
    validateDateOnly,
    timeToSeconds,
    validateProgrammingWindow,
    validatePersonalFunction,
    getWeekDay,
    scheduleAppliesToDate,
} = require('../validations/programacion.validation');

const {
    Ruta,
    RutaVersion,
    RutaHorario,
    Vehiculo,
    PersonalOperativo,
    ConductorPerfil,
    Usuario,
    Persona,
    Roles,
    ProgramacionRuta,
    ProgramacionPersonal,
    ProgramacionHistorial,
} = db;

/*
|--------------------------------------------------------------------------
| Validar horario configurado para la ruta
|--------------------------------------------------------------------------
*/

const validateRouteSchedule = async ({
    id_ruta,
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    transaction = null,
}) => {
    const weekDay =
        getWeekDay(
            fecha_programada,
        );

    const schedules =
        await RutaHorario.findAll({
            where: {
                id_ruta,
                dia_semana:
                    weekDay,
                estado: true,
            },

            transaction,
        });

    const requestedStart =
        timeToSeconds(
            hora_inicio_programada,
        );

    const requestedEnd =
        timeToSeconds(
            hora_fin_programada,
        );

    const validSchedule =
        schedules.some(
            (schedule) => {
                const applies =
                    scheduleAppliesToDate(
                        schedule,
                        fecha_programada,
                    );

                const scheduleStart =
                    timeToSeconds(
                        schedule.hora_inicio,
                    );

                const scheduleEnd =
                    timeToSeconds(
                        schedule.hora_fin,
                    );

                return (
                    applies &&
                    requestedStart >=
                    scheduleStart &&
                    requestedEnd <=
                    scheduleEnd
                );
            },
        );

    if (!validSchedule) {
        throw new AppError(
            'La fecha y horas indicadas no corresponden a un horario activo de la ruta.',
            409,
            'ROUTE_SCHEDULE_NOT_APPLICABLE',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Validar ruta y versión
|--------------------------------------------------------------------------
*/

const validateRouteAndVersion = async ({
    id_ruta,
    id_ruta_version = null,
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    transaction = null,
}) => {
    const routeId =
        validateId(
            id_ruta,
            'identificador de la ruta',
        );

    const ruta =
        await Ruta.findByPk(
            routeId,
            {
                include: [
                    {
                        association:
                            'zona',

                        attributes: [
                            'id_zona',
                            'estado',
                        ],
                    },
                ],

                transaction,
            },
        );

    if (!ruta) {
        throw new AppError(
            'La ruta no fue encontrada.',
            404,
            'ROUTE_NOT_FOUND',
        );
    }

    if (
        !ruta.estado ||
        ruta.estado_ruta !==
        'ACTIVA' ||
        !ruta.zona?.estado
    ) {
        throw new AppError(
            'La ruta o su zona no se encuentran activas.',
            409,
            'ROUTE_NOT_AVAILABLE',
        );
    }

    let version;

    if (id_ruta_version) {
        const versionId =
            validateId(
                id_ruta_version,
                'identificador de la versión',
            );

        version =
            await RutaVersion.findOne({
                where: {
                    id_ruta_version:
                        versionId,

                    id_ruta:
                        routeId,

                    estado: true,
                },

                transaction,
            });
    } else {
        version =
            await RutaVersion.findOne({
                where: {
                    id_ruta:
                        routeId,

                    vigente: true,
                    estado: true,
                },

                transaction,
            });
    }

    if (!version) {
        throw new AppError(
            'La ruta no tiene una versión válida.',
            409,
            'ROUTE_VERSION_NOT_AVAILABLE',
        );
    }

    await validateRouteSchedule({
        id_ruta: routeId,
        fecha_programada,
        hora_inicio_programada,
        hora_fin_programada,
        transaction,
    });

    return {
        ruta,
        version,
    };
};

/*
|--------------------------------------------------------------------------
| Validar vehículo
|--------------------------------------------------------------------------
*/
const validateVehicle = async (
    idVehiculo,
    transaction = null,
) => {
    const vehicleId =
        validateId(
            idVehiculo,
            'identificador del vehículo',
        );

    const vehicle =
        await Vehiculo.findByPk(
            vehicleId,
            {
                transaction,
            },
        );

    if (!vehicle) {
        throw new AppError(
            'El vehículo no fue encontrado.',
            404,
            'VEHICLE_NOT_FOUND',
        );
    }

    if (!vehicle.estado) {
        throw new AppError(
            'El vehículo se encuentra inactivo.',
            409,
            'VEHICLE_INACTIVE',
        );
    }

    if (
        ESTADOS_VEHICULO_NO_OPERATIVO
            .includes(
                vehicle.estado_operativo,
            )
    ) {
        throw new AppError(
            'El vehículo no se encuentra disponible operativamente.',
            409,
            'VEHICLE_NOT_OPERATIONAL',
        );
    }

    return vehicle;
};

/*
|--------------------------------------------------------------------------
| Comprobar disponibilidad del vehículo
|--------------------------------------------------------------------------
*/

const assertVehicleAvailable = async ({
    id_vehiculo,
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    excludeProgramacionId = null,
    transaction = null,
}) => {
    const where = {
        id_vehiculo,
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
                excludeProgramacionId,
        };
    }

    const conflict =
        await ProgramacionRuta.findOne({
            where,
            transaction,
        });

    if (conflict) {
        throw new AppError(
            'El vehículo ya tiene otra programación en el horario indicado.',
            409,
            'VEHICLE_SCHEDULE_CONFLICT',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Obtener personal para una función
|--------------------------------------------------------------------------
*/

const getPersonalForFunction = async ({
    id_personal,
    funcion,
    transaction = null,
}) => {
    const normalizedFunction =
        validatePersonalFunction(
            funcion,
        );

    const personalId =
        validateId(
            id_personal,
            'identificador del personal',
        );

    const personal =
        await PersonalOperativo.findByPk(
            personalId,
            {
                include: [
                    {
                        model:
                            Usuario,

                        as: 'usuario',

                        where: {
                            estado: true,
                        },

                        required: true,

                        include: [
                            {
                                model:
                                    Persona,

                                as: 'persona',

                                where: {
                                    estado: true,
                                },

                                required: true,
                            },
                            {
                                model:
                                    Roles,

                                as: 'roles',

                                where: {
                                    nombre:
                                        normalizedFunction,

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
                    {
                        model:
                            ConductorPerfil,

                        as: 'conductor',

                        required: false,
                    },
                ],

                transaction,
            },
        );

    if (!personal) {
        throw new AppError(
            `El personal no existe, está inactivo o no tiene el rol ${normalizedFunction}.`,
            409,
            'PERSONAL_NOT_AVAILABLE',
        );
    }

    if (
        !personal.estado ||
        personal.estado_laboral !==
        'ACTIVO'
    ) {
        throw new AppError(
            'El personal no se encuentra laboralmente activo.',
            409,
            'PERSONAL_INACTIVE',
        );
    }

    if (
        normalizedFunction ===
        'CONDUCTOR'
    ) {
        const conductor =
            personal.conductor;

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        if (
            !conductor ||
            !conductor.estado ||
            conductor.estado_licencia !==
            'VIGENTE' ||
            !conductor
                .fecha_vencimiento_licencia ||
            conductor
                .fecha_vencimiento_licencia <
            today
        ) {
            throw new AppError(
                'El conductor no tiene una licencia vigente.',
                409,
                'DRIVER_LICENSE_NOT_VALID',
            );
        }
    }

    return personal;
};

/*
|--------------------------------------------------------------------------
| Comprobar disponibilidad del personal
|--------------------------------------------------------------------------
*/

const assertPersonalAvailable = async ({
    id_personal,
    fecha_programada,
    hora_inicio_programada,
    hora_fin_programada,
    excludeProgramacionId = null,
    transaction = null,
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
                excludeProgramacionId,
        };
    }

    const conflict =
        await ProgramacionPersonal.findOne({
            where: {
                id_personal,

                estado_asignacion: {
                    [Op.notIn]:
                        ESTADOS_ASIGNACION_SIN_CONFLICTO,
                },
            },

            include: [
                {
                    model:
                        ProgramacionRuta,

                    as: 'programacion',

                    where:
                        programmingWhere,

                    required: true,
                },
            ],

            transaction,
        });

    if (conflict) {
        throw new AppError(
            'El personal ya tiene otra programación en el horario indicado.',
            409,
            'PERSONAL_SCHEDULE_CONFLICT',
        );
    }
};

/*
|--------------------------------------------------------------------------
| Registrar historial
|--------------------------------------------------------------------------
*/

const registerHistory = async ({
    id_programacion,
    id_usuario = null,
    tipo_evento,
    estado_anterior = null,
    estado_nuevo = null,
    datos_anteriores = null,
    datos_nuevos = null,
    observacion = null,
    origen = 'WEB',
    ip = null,
    user_agent = null,
    transaction = null,
}) => {
    return ProgramacionHistorial.create(
        {
            id_programacion,
            id_usuario,
            tipo_evento,
            estado_anterior,
            estado_nuevo,
            datos_anteriores,
            datos_nuevos,
            observacion,
            origen,
            ip,
            user_agent,
        },
        {
            transaction,
        },
    );
};

/*
|--------------------------------------------------------------------------
| Exportaciones
|--------------------------------------------------------------------------
|
| También se exportan constantes y validaciones para que los services
| necesiten importar solamente este archivo.
|
*/

module.exports = {
    // Constantes
    ESTADOS_CONFLICTO,
    FUNCIONES_PERSONAL,
    DIAS_SEMANA,

    // Validaciones
    validateId,
    validateDateOnly,
    validateProgrammingWindow,
    validatePersonalFunction,
    getWeekDay,
    scheduleAppliesToDate,

    // Utilidades con acceso a base de datos
    validateRouteSchedule,
    validateRouteAndVersion,
    validateVehicle,
    assertVehicleAvailable,
    getPersonalForFunction,
    assertPersonalAvailable,
    registerHistory,
};