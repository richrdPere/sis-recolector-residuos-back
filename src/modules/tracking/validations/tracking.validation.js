const AppError = require('../../../utils/app-error');

// ===============================================
// Validar identificador
// ===============================================
const validateId = (
  value,
  field = 'identificador',
) => {
  const id =
    Number(value);

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

// ===============================================
// Validar número obligatorio
// ===============================================
const validateRequiredNumber = (
  value,
  field,
  {
    min = null,
    max = null,
  } = {},
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    throw new AppError(
      `El campo ${field} es obligatorio.`,
      400,
      'REQUIRED_FIELD',
    );
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    throw new AppError(
      `El campo ${field} no es válido.`,
      400,
      'INVALID_NUMBER',
    );
  }

  if (
    min !== null &&
    number < min
  ) {
    throw new AppError(
      `El campo ${field} no puede ser menor que ${min}.`,
      400,
      'NUMBER_BELOW_MINIMUM',
    );
  }

  if (
    max !== null &&
    number > max
  ) {
    throw new AppError(
      `El campo ${field} no puede ser mayor que ${max}.`,
      400,
      'NUMBER_ABOVE_MAXIMUM',
    );
  }

  return number;
};

// ===============================================
// Validar número opcional
// ===============================================
const validateOptionalNumber = (
  value,
  field,
  options = {},
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return validateRequiredNumber(
    value,
    field,
    options,
  );
};

// ===============================================
// Validar fecha del dispositivo
// ===============================================
const validateDeviceDate = (
  value,
) => {
  if (!value) {
    throw new AppError(
      'La fecha del dispositivo es obligatoria.',
      400,
      'DEVICE_DATE_REQUIRED',
    );
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new AppError(
      'La fecha del dispositivo no es válida.',
      400,
      'INVALID_DEVICE_DATE',
    );
  }

  const maximumFutureDate =
    Date.now() +
    5 * 60 * 1000;

  if (
    date.getTime() >
    maximumFutureDate
  ) {
    throw new AppError(
      'La fecha del dispositivo no puede estar adelantada más de cinco minutos.',
      400,
      'DEVICE_DATE_IN_FUTURE',
    );
  }

  return date;
};

// ===============================================
// Validar clave de idempotencia
// ===============================================
const validateIdempotencyKey = (
  value,
) => {
  const key =
    String(
      value || '',
    ).trim();

  if (!key) {
    throw new AppError(
      'La clave de idempotencia es obligatoria.',
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  }

  if (
    key.length > 100
  ) {
    throw new AppError(
      'La clave de idempotencia no puede superar los 100 caracteres.',
      400,
      'INVALID_IDEMPOTENCY_KEY',
    );
  }

  return key;
};

// ===============================================
// Normalizar ubicación
// ===============================================
const normalizeLocation = (
  payload,
) => {
  const latitud =
    validateRequiredNumber(
      payload.latitud,
      'latitud',
      {
        min: -90,
        max: 90,
      },
    );

  const longitud =
    validateRequiredNumber(
      payload.longitud,
      'longitud',
      {
        min: -180,
        max: 180,
      },
    );

  const precisionGps =
    validateOptionalNumber(
      payload.precision_gps,
      'precisión GPS',
      {
        min: 0,
      },
    );

  const altitud =
    validateOptionalNumber(
      payload.altitud,
      'altitud',
    );

  const velocidadMps =
    validateOptionalNumber(
      payload.velocidad_mps,
      'velocidad',
      {
        min: 0,
      },
    );

  const rumbo =
    validateOptionalNumber(
      payload.rumbo,
      'rumbo',
      {
        min: 0,
        max: 360,
      },
    );

  const nivelBateria =
    validateOptionalNumber(
      payload.nivel_bateria,
      'nivel de batería',
      {
        min: 0,
        max: 100,
      },
    );

  return {
    latitud,
    longitud,

    precision_gps: precisionGps,
    altitud,
    velocidad_mps: velocidadMps,

    rumbo, nivel_bateria: nivelBateria,
    es_ubicacion_simulada:
      payload
        .es_ubicacion_simulada ===
      true,

    fecha_dispositivo:
      validateDeviceDate(
        payload
          .fecha_dispositivo,
      ),

    clave_idempotencia:
      validateIdempotencyKey(
        payload
          .clave_idempotencia,
      ),
  };
};

module.exports = {
  validateId,
  validateRequiredNumber,
  validateOptionalNumber,
  validateDeviceDate,
  validateIdempotencyKey,
  normalizeLocation,
};