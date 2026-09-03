const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Constants
const {
    ESTADOS_RECORRIDO,
    ESTADOS_PROGRAMACION,
    TIPOS_EVENTO_RECORRIDO,
} = require('../utils/recorrido.constants');

// Validations
const {
    validateId,
    validateCoordinates,
    validatePrecision,
    validateEventDate,
    validateIdempotencyKey,
    normalizeOrigin,
    validateObservation,
} = require('../validations/recorrido.validation');

// Utils
const {
    getRecorridoOrFail,
    getProgramacionOrFail,
    assertAssignedDriver,
    createRecorridoEvent,
    findIdempotentEvent,
    getRecorridoDetail,
} = require('../utils/recorrido-service.utils');

// Models
const { sequelize } = db;

// =======================================================
// Service: Pausar recorrido
// =======================================================
const pausarRecorridoService = async ({
    id_recorrido,
    id_usuario,
    fecha_evento = null,
    latitud = null,
    longitud = null,
    precision_gps = null,
    observacion = null,
    clave_idempotencia = null,
    origen = 'APP',
    ip = null,
    user_agent = null,
}) => {
    const recorridoId =
        validateId(
            id_recorrido,
            'identificador del recorrido',
        );

    const userId =
        validateId(
            id_usuario,
            'identificador del usuario',
        );

    const location =
        validateCoordinates({
            latitud,
            longitud,
        });

    const eventDate =
        validateEventDate(
            fecha_evento,
        );

    const accuracy =
        validatePrecision(
            precision_gps,
        );

    const observation =
        validateObservation(
            observacion,
        );

    const idempotencyKey =
        validateIdempotencyKey(
            clave_idempotencia,
        );

    const previousEvent =
        await findIdempotentEvent({
            clave_idempotencia:
                idempotencyKey,

            tipo_evento:
                TIPOS_EVENTO_RECORRIDO
                    .PAUSA,

            id_usuario:
                userId,
        });

    if (previousEvent) {
        return getRecorridoDetail(
            previousEvent.id_recorrido,
        );
    }

    const transaction =
        await sequelize.transaction();

    try {
        const recorrido =
            await getRecorridoOrFail(
                recorridoId,
                transaction,
                true,
            );

        if (
            recorrido.estado_recorrido !==
            ESTADOS_RECORRIDO.EN_CURSO
        ) {
            throw new AppError(
                'Solo se puede pausar un recorrido en curso.',
                409,
                'ROUTE_EXECUTION_CANNOT_PAUSE',
            );
        }

        await assertAssignedDriver({
            id_programacion:
                recorrido.id_programacion,

            id_usuario:
                userId,

            transaction,
        });

        const programacion =
            await getProgramacionOrFail(
                recorrido.id_programacion,
                transaction,
                true,
            );

        await recorrido.update(
            {
                estado_recorrido:
                    ESTADOS_RECORRIDO.PAUSADO,
            },
            {
                transaction,
            },
        );

        await programacion.update(
            {
                estado_programacion:
                    ESTADOS_PROGRAMACION.PAUSADA,
            },
            {
                transaction,
            },
        );

        await createRecorridoEvent({
            id_recorrido:
                recorridoId,
            id_usuario:
                userId,
            tipo_evento:
                TIPOS_EVENTO_RECORRIDO.PAUSA,
            fecha_evento:
                eventDate,
            latitud:
                location.latitud,
            longitud:
                location.longitud,
            precision_gps:
                accuracy,
            observacion:
                observation,
            clave_idempotencia:
                idempotencyKey,
            origen:
                normalizeOrigin(origen),
            ip,
            user_agent,
            transaction,
        });

        await transaction.commit();

        return getRecorridoDetail(
            recorridoId,
        );
    } catch (error) {
        if (!transaction.finished) {
            await transaction.rollback();
        }

        throw error;
    }
};

module.exports = pausarRecorridoService;