const AppError = require('../../../utils/app-error');

const { ORIGENES_EVENTO } = require('../utils/recorrido.constants');

const validateId = (
    value,
    field = 'identificador',
) => {
    const id = Number(value);

    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new AppError(
            `El ${field} no es válido.`,
            400,
            'INVALID_ID',
        );
    }

    return id;
};

const validateCoordinates = ({
    latitud,
    longitud,
    required = false,
}) => {
    const latitudeMissing =
        latitud === undefined ||
        latitud === null ||
        latitud === '';

    const longitudeMissing =
        longitud === undefined ||
        longitud === null ||
        longitud === '';

    if (
        required &&
        (
            latitudeMissing ||
            longitudeMissing
        )
    ) {
        throw new AppError(
            'La latitud y longitud son obligatorias.',
            400,
            'LOCATION_REQUIRED',
        );
    }

    if (
        latitudeMissing &&
        longitudeMissing
    ) {
        return {
            latitud: null,
            longitud: null,
        };
    }

    if (
        latitudeMissing ||
        longitudeMissing
    ) {
        throw new AppError(
            'La latitud y longitud deben enviarse juntas.',
            400,
            'INCOMPLETE_LOCATION',
        );
    }

    const normalizedLatitude =
        Number(latitud);

    const normalizedLongitude =
        Number(longitud);

    if (
        !Number.isFinite(
            normalizedLatitude,
        ) ||
        normalizedLatitude < -90 ||
        normalizedLatitude > 90
    ) {
        throw new AppError(
            'La latitud no es válida.',
            400,
            'INVALID_LATITUDE',
        );
    }

    if (
        !Number.isFinite(
            normalizedLongitude,
        ) ||
        normalizedLongitude < -180 ||
        normalizedLongitude > 180
    ) {
        throw new AppError(
            'La longitud no es válida.',
            400,
            'INVALID_LONGITUDE',
        );
    }

    return {
        latitud:
            normalizedLatitude,

        longitud:
            normalizedLongitude,
    };
};

const validatePrecision = (
    value,
) => {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const precision =
        Number(value);

    if (
        !Number.isFinite(precision) ||
        precision < 0
    ) {
        throw new AppError(
            'La precisión GPS no es válida.',
            400,
            'INVALID_GPS_ACCURACY',
        );
    }

    return precision;
};

const validateMileage = (
    value,
    field = 'kilometraje',
) => {
    if (
        value === undefined ||
        value === null ||
        value === ''
    ) {
        return null;
    }

    const mileage =
        Number(value);

    if (
        !Number.isFinite(mileage) ||
        mileage < 0
    ) {
        throw new AppError(
            `El ${field} no es válido.`,
            400,
            'INVALID_MILEAGE',
        );
    }

    return mileage;
};

const validateEventDate = (
    value,
) => {
    if (!value) {
        return new Date();
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new AppError(
            'La fecha del evento no es válida.',
            400,
            'INVALID_EVENT_DATE',
        );
    }

    return date;
};

const validateIdempotencyKey = (
    value,
) => {
    if (!value) {
        return null;
    }

    const key =
        String(value).trim();

    if (
        key.length < 8 ||
        key.length > 100
    ) {
        throw new AppError(
            'La clave de idempotencia debe tener entre 8 y 100 caracteres.',
            400,
            'INVALID_IDEMPOTENCY_KEY',
        );
    }

    return key;
};

const normalizeOrigin = (
    value,
) => {
    const origin =
        String(value || 'APP')
            .trim()
            .toUpperCase();

    return ORIGENES_EVENTO
        .includes(origin)
        ? origin
        : 'APP';
};

const validateObservation = (
    value,
    required = false,
) => {
    const observation =
        value
            ? String(value).trim()
            : null;

    if (
        required &&
        !observation
    ) {
        throw new AppError(
            'La observación es obligatoria.',
            400,
            'OBSERVATION_REQUIRED',
        );
    }

    if (
        observation &&
        observation.length > 2000
    ) {
        throw new AppError(
            'La observación no puede superar los 2000 caracteres.',
            400,
            'OBSERVATION_TOO_LONG',
        );
    }

    return observation;
};

module.exports = {
    validateId,
    validateCoordinates,
    validatePrecision,
    validateMileage,
    validateEventDate,
    validateIdempotencyKey,
    normalizeOrigin,
    validateObservation,
};