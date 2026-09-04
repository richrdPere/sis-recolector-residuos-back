// validations/recoleccion.validation.js
const AppError = require('../../../utils/app-error');

const UNIDADES_PERMITIDAS = [
  'KG',
  'TONELADA',
  'LITRO',
  'M3',
];

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

  const maximumDate =
    Date.now() +
    5 * 60 * 1000;

  if (
    date.getTime() >
    maximumDate
  ) {
    throw new AppError(
      'La fecha del dispositivo está demasiado adelantada.',
      400,
      'DEVICE_DATE_IN_FUTURE',
    );
  }

  return date;
};

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

  if (key.length > 100) {
    throw new AppError(
      'La clave de idempotencia no puede superar los 100 caracteres.',
      400,
      'INVALID_IDEMPOTENCY_KEY',
    );
  }

  return key;
};

const normalizeOptionalNumber = (
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
    return null;
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

const normalizeCollectionPayload = (
  payload,
) => {
  const latitud =
    normalizeOptionalNumber(
      payload.latitud,
      'latitud',
      {
        min: -90,
        max: 90,
      },
    );

  const longitud =
    normalizeOptionalNumber(
      payload.longitud,
      'longitud',
      {
        min: -180,
        max: 180,
      },
    );

  if (
    (
      latitud === null
    ) !==
    (
      longitud === null
    )
  ) {
    throw new AppError(
      'La latitud y longitud deben enviarse juntas.',
      400,
      'INCOMPLETE_LOCATION',
    );
  }

  const cantidad =
    normalizeOptionalNumber(
      payload
        .cantidad_recolectada,
      'cantidad recolectada',
      {
        min: 0,
      },
    );

  let unidad = null;

  if (
    payload.unidad_medida !==
    null &&
    payload.unidad_medida !==
    undefined &&
    payload.unidad_medida !==
    ''
  ) {
    unidad =
      String(
        payload.unidad_medida,
      )
        .trim()
        .toUpperCase();

    if (
      !UNIDADES_PERMITIDAS
        .includes(unidad)
    ) {
      throw new AppError(
        'La unidad de medida no es válida.',
        400,
        'INVALID_MEASUREMENT_UNIT',
      );
    }
  }

  if (
    (
      cantidad === null
    ) !==
    (
      unidad === null
    )
  ) {
    throw new AppError(
      'La cantidad recolectada y su unidad deben enviarse juntas.',
      400,
      'INCOMPLETE_COLLECTED_AMOUNT',
    );
  }

  return {
    latitud,
    longitud,

    precision_gps:
      normalizeOptionalNumber(
        payload.precision_gps,
        'precisión GPS',
        {
          min: 0,
        },
      ),

    cantidad_recolectada:
      cantidad,

    unidad_medida:
      unidad,

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

    observacion:
      payload.observacion
        ?.trim() ||
      null,
  };
};

module.exports = {
  UNIDADES_PERMITIDAS,
  validateId,
  validateDeviceDate,
  validateIdempotencyKey,
  normalizeOptionalNumber,
  normalizeCollectionPayload,
};