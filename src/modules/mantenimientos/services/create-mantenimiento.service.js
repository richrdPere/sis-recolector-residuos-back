const db = require('../../../database/models');

// Utils
const {
    CAMPOS_CREACION,
    error,
    validarBody,
    validarIntervalo,
    prepararDatos,
} = require("../utils/mantenimientos.utils");

// Validation
const {
    bloquearVehiculo,
    obtenerDetalle,
    validarActor,
    registrarHistorial,
    validarDisponibilidad,
} = require("../validations/mantenimientos.validation");

// Modelos
const {
    sequelize,
    VehiculoMantenimiento,
} = db;

// *********************************************************
// SERVICE: CREAR MANTENIMIENTO
// *********************************************************
const createMantenimientoService = async ({
    usuarioId,
    body,
}) => {
    validarBody(body, CAMPOS_CREACION);

    const datos = prepararDatos(body);

    for (const campo of [
        'id_vehiculo',
        'tipo_mantenimiento',
        'fecha_inicio_programada',
        'fecha_fin_programada',
        'motivo',
    ]) {
        if (datos[campo] == null) {
            error(`${campo} es obligatorio.`);
        }
    }

    validarIntervalo(
        datos.fecha_inicio_programada,
        datos.fecha_fin_programada,
    );

    return sequelize.transaction(
        async (transaction) => {
            const actorId = await validarActor(
                usuarioId,
                transaction,
            );

            const vehiculo = await bloquearVehiculo(
                datos.id_vehiculo,
                transaction,
            );

            if (!vehiculo.estado) {
                error(
                    'El vehículo está desactivado administrativamente.',
                    409,
                );
            }

            await validarDisponibilidad({
                idVehiculo: vehiculo.id_vehiculo,
                inicio: datos.fecha_inicio_programada,
                fin: datos.fecha_fin_programada,
                transaction,
            });

            const mantenimiento =
                await VehiculoMantenimiento.create(
                    {
                        ...datos,
                        id_usuario_creacion: actorId,
                        estado_mantenimiento: 'PROGRAMADO',
                    },
                    { transaction },
                );

            await registrarHistorial({
                mantenimiento,
                usuarioId: actorId,
                tipoEvento: 'CREACION',
                anterior: null,
                transaction,
            });

            return obtenerDetalle(
                mantenimiento.id_mantenimiento,
                transaction,
            );
        },
    );
};

module.exports = createMantenimientoService;