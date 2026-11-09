'use strict';

const AppError = require('../../../utils/app-error');

const {
  RESULTADOS_ATENCION,
  MOTIVOS_OMISION,
} = require('../constants/atencion.constants');

const UNIDADES_PERMITIDAS = [
  'KG',
  'TONELADA',
  'LITRO',
  'M3',
];

// ==========================================================
// ERROR DE VALIDACIÓN
// ==========================================================

const fail = (message, code) => {
  throw new AppError(
    message,
    400,
    code,
  );
};

// ==========================================================
// IDENTIFICADORES
// ==========================================================

const validateId = (
  value,
  field = 'identificador',
) => {
  const tipoValido = [
    'number',
    'string',
  ].includes(typeof value);

  const textoValido =
    typeof value !== 'string' ||
    /^\d+$/.test(value.trim());

  if (!tipoValido || !textoValido) {
    fail(
      `El ${field} no es válido.`,
      'INVALID_ID',
    );
  }

  const id = Number(value);

  if (
    !Number.isSafeInteger(id) ||
    id <= 0
  ) {
    fail(
      `El ${field} no es válido.`,
      'INVALID_ID',
    );
  }

  return id;
};

// ==========================================================
// FECHA DEL DISPOSITIVO
// ==========================================================

const validateDeviceDate = (value) => {
  if (!value) {
    fail(
      'La fecha del dispositivo es obligatoria.',
      'DEVICE_DATE_REQUIRED',
    );
  }

  // Admite milisegundos y microsegundos de Dart.
  // Exige zona horaria para evitar interpretación local.
  const match =
    typeof value === 'string' &&
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/,
    );

  const date = new Date(value);

  if (
    !match ||
    !Number.isFinite(date.getTime())
  ) {
    fail(
      'La fecha debe ser ISO 8601 con zona horaria.',
      'INVALID_DEVICE_DATE',
    );
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
    second,
  ] = match;

  const daysInMonth = new Date(
    Date.UTC(
      Number(year),
      Number(month),
      0,
    ),
  ).getUTCDate();

  if (
    Number(year) < 2000 ||
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > daysInMonth ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59
  ) {
    fail(
      'La fecha del dispositivo no es válida.',
      'INVALID_DEVICE_DATE',
    );
  }

  const maximumDate =
    Date.now() + 5 * 60 * 1000;

  if (date.getTime() > maximumDate) {
    fail(
      'La fecha del dispositivo está demasiado adelantada.',
      'DEVICE_DATE_IN_FUTURE',
    );
  }

  return date;
};

// ==========================================================
// IDEMPOTENCIA
// ==========================================================

const validateIdempotencyKey = (value) => {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    fail(
      'La clave de idempotencia es obligatoria.',
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  }

  const key = value.trim();

  // Conserva compatibilidad con claves históricas.
  if (key.length > 100) {
    fail(
      'La clave de idempotencia no puede superar los 100 caracteres.',
      'INVALID_IDEMPOTENCY_KEY',
    );
  }

  return key;
};

// ==========================================================
// NÚMEROS OPCIONALES
// ==========================================================

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

  const tipoValido = [
    'number',
    'string',
  ].includes(typeof value);

  const textoValido =
    typeof value !== 'string' ||
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(
      value.trim(),
    );

  if (!tipoValido || !textoValido) {
    fail(
      `El campo ${field} no es válido.`,
      'INVALID_NUMBER',
    );
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    fail(
      `El campo ${field} no es válido.`,
      'INVALID_NUMBER',
    );
  }

  if (min !== null && number < min) {
    fail(
      `El campo ${field} no puede ser menor que ${min}.`,
      'NUMBER_BELOW_MINIMUM',
    );
  }

  if (max !== null && number > max) {
    fail(
      `El campo ${field} no puede ser mayor que ${max}.`,
      'NUMBER_ABOVE_MAXIMUM',
    );
  }

  return number;
};

// ==========================================================
// TEXTO
// ==========================================================

const optionalText = (
  value,
  field,
  max,
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== 'string') {
    fail(
      `El campo ${field} debe ser texto.`,
      'INVALID_TEXT',
    );
  }

  const text = value.trim();

  if (text.length > max) {
    fail(
      `El campo ${field} no puede superar ${max} caracteres.`,
      'TEXT_TOO_LONG',
    );
  }

  return text || null;
};

// ==========================================================
// ENUMERACIONES
// ==========================================================

const enumValue = (
  value,
  allowed,
  field,
) => {
  if (
    typeof value !== 'string' ||
    !allowed.includes(
      value.trim().toUpperCase(),
    )
  ) {
    fail(
      `El campo ${field} no es válido.`,
      'INVALID_ENUM',
    );
  }

  return value.trim().toUpperCase();
};

// ==========================================================
// ESCALA DECIMAL
// ==========================================================

const round = (
  value,
  digits,
) => {
  return value === null
    ? null
    : Number(value.toFixed(digits));
};

// ==========================================================
// NORMALIZAR ATENCIÓN U OMISIÓN
// ==========================================================

const normalizeCollectionPayload = (payload) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    fail(
      'El cuerpo de la atención debe ser un objeto.',
      'INVALID_COLLECTION_PAYLOAD',
    );
  }

  // Compatibilidad con el cliente móvil actual.
  const resultado =
    payload.resultado_atencion === undefined
      ? 'ATENDIDO'
      : enumValue(
        payload.resultado_atencion,
        RESULTADOS_ATENCION,
        'resultado_atencion',
      );

  const latitud = normalizeOptionalNumber(
    payload.latitud,
    'latitud',
    {
      min: -90,
      max: 90,
    },
  );

  const longitud = normalizeOptionalNumber(
    payload.longitud,
    'longitud',
    {
      min: -180,
      max: 180,
    },
  );

  if (
    (latitud === null) !==
    (longitud === null)
  ) {
    fail(
      'La latitud y longitud deben enviarse juntas.',
      'INCOMPLETE_LOCATION',
    );
  }

  const precision = normalizeOptionalNumber(
    payload.precision_gps,
    'precisión GPS',
    {
      min: 0,
      max: 999999.99,
    },
  );

  const cantidad = normalizeOptionalNumber(
    payload.cantidad_recolectada,
    'cantidad recolectada',
    {
      min: 0,
      max: 99999999999.999,
    },
  );

  const unidad =
    payload.unidad_medida == null ||
      payload.unidad_medida === ''
      ? null
      : enumValue(
        payload.unidad_medida,
        UNIDADES_PERMITIDAS,
        'unidad_medida',
      );

  if (
    (cantidad === null) !==
    (unidad === null)
  ) {
    fail(
      'La cantidad recolectada y su unidad deben enviarse juntas.',
      'INCOMPLETE_COLLECTED_AMOUNT',
    );
  }

  const observacion = optionalText(
    payload.observacion,
    'observación',
    1000,
  );

  const motivo = optionalText(
    payload.motivo_omision,
    'motivo de omisión',
    50,
  );

  let motivoNormalizado = null;

  if (resultado === 'OMITIDO') {
    motivoNormalizado = enumValue(
      motivo,
      MOTIVOS_OMISION,
      'motivo_omision',
    );

    if (!observacion) {
      fail(
        'Explica por qué se omitió el punto.',
        'OMISSION_OBSERVATION_REQUIRED',
      );
    }

    if (
      cantidad !== null ||
      unidad !== null
    ) {
      fail(
        'Una omisión no puede registrar cantidad ni unidad de residuos.',
        'OMISSION_WITH_AMOUNT',
      );
    }
  } else if (motivo !== null) {
    fail(
      'Un punto atendido no admite motivo de omisión.',
      'ATTENDED_WITH_OMISSION_REASON',
    );
  }

  return {
    resultado_atencion: resultado,
    motivo_omision: motivoNormalizado,

    latitud: round(latitud, 7),
    longitud: round(longitud, 7),
    precision_gps: round(precision, 2),

    cantidad_recolectada: round(cantidad, 3),
    unidad_medida: unidad,

    fecha_dispositivo: validateDeviceDate(
      payload.fecha_dispositivo,
    ),

    clave_idempotencia: validateIdempotencyKey(
      payload.clave_idempotencia,
    ),

    observacion,
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

// // validations/recoleccion.validation.js
// const AppError = require('../../../utils/app-error');

// const UNIDADES_PERMITIDAS = [
//   'KG',
//   'TONELADA',
//   'LITRO',
//   'M3',
// ];

// const validateId = (
//   value,
//   field = 'identificador',
// ) => {
//   const id =
//     Number(value);

//   if (
//     !Number.isInteger(id) ||
//     id <= 0
//   ) {
//     throw new AppError(
//       `El ${field} no es válido.`,
//       400,
//       'INVALID_ID',
//     );
//   }

//   return id;
// };

// const validateDeviceDate = (
//   value,
// ) => {
//   if (!value) {
//     throw new AppError(
//       'La fecha del dispositivo es obligatoria.',
//       400,
//       'DEVICE_DATE_REQUIRED',
//     );
//   }

//   const date =
//     new Date(value);

//   if (
//     Number.isNaN(
//       date.getTime(),
//     )
//   ) {
//     throw new AppError(
//       'La fecha del dispositivo no es válida.',
//       400,
//       'INVALID_DEVICE_DATE',
//     );
//   }

//   const maximumDate =
//     Date.now() +
//     5 * 60 * 1000;

//   if (
//     date.getTime() >
//     maximumDate
//   ) {
//     throw new AppError(
//       'La fecha del dispositivo está demasiado adelantada.',
//       400,
//       'DEVICE_DATE_IN_FUTURE',
//     );
//   }

//   return date;
// };

// const validateIdempotencyKey = (
//   value,
// ) => {
//   const key =
//     String(
//       value || '',
//     ).trim();

//   if (!key) {
//     throw new AppError(
//       'La clave de idempotencia es obligatoria.',
//       400,
//       'IDEMPOTENCY_KEY_REQUIRED',
//     );
//   }

//   if (key.length > 100) {
//     throw new AppError(
//       'La clave de idempotencia no puede superar los 100 caracteres.',
//       400,
//       'INVALID_IDEMPOTENCY_KEY',
//     );
//   }

//   return key;
// };

// const normalizeOptionalNumber = (
//   value,
//   field,
//   {
//     min = null,
//     max = null,
//   } = {},
// ) => {
//   if (
//     value === null ||
//     value === undefined ||
//     value === ''
//   ) {
//     return null;
//   }

//   const number =
//     Number(value);

//   if (
//     !Number.isFinite(
//       number,
//     )
//   ) {
//     throw new AppError(
//       `El campo ${field} no es válido.`,
//       400,
//       'INVALID_NUMBER',
//     );
//   }

//   if (
//     min !== null &&
//     number < min
//   ) {
//     throw new AppError(
//       `El campo ${field} no puede ser menor que ${min}.`,
//       400,
//       'NUMBER_BELOW_MINIMUM',
//     );
//   }

//   if (
//     max !== null &&
//     number > max
//   ) {
//     throw new AppError(
//       `El campo ${field} no puede ser mayor que ${max}.`,
//       400,
//       'NUMBER_ABOVE_MAXIMUM',
//     );
//   }

//   return number;
// };

// const normalizeCollectionPayload = (
//   payload,
// ) => {
//   const latitud =
//     normalizeOptionalNumber(
//       payload.latitud,
//       'latitud',
//       {
//         min: -90,
//         max: 90,
//       },
//     );

//   const longitud =
//     normalizeOptionalNumber(
//       payload.longitud,
//       'longitud',
//       {
//         min: -180,
//         max: 180,
//       },
//     );

//   if (
//     (
//       latitud === null
//     ) !==
//     (
//       longitud === null
//     )
//   ) {
//     throw new AppError(
//       'La latitud y longitud deben enviarse juntas.',
//       400,
//       'INCOMPLETE_LOCATION',
//     );
//   }

//   const cantidad =
//     normalizeOptionalNumber(
//       payload
//         .cantidad_recolectada,
//       'cantidad recolectada',
//       {
//         min: 0,
//       },
//     );

//   let unidad = null;

//   if (
//     payload.unidad_medida !==
//     null &&
//     payload.unidad_medida !==
//     undefined &&
//     payload.unidad_medida !==
//     ''
//   ) {
//     unidad =
//       String(
//         payload.unidad_medida,
//       )
//         .trim()
//         .toUpperCase();

//     if (
//       !UNIDADES_PERMITIDAS
//         .includes(unidad)
//     ) {
//       throw new AppError(
//         'La unidad de medida no es válida.',
//         400,
//         'INVALID_MEASUREMENT_UNIT',
//       );
//     }
//   }

//   if (
//     (
//       cantidad === null
//     ) !==
//     (
//       unidad === null
//     )
//   ) {
//     throw new AppError(
//       'La cantidad recolectada y su unidad deben enviarse juntas.',
//       400,
//       'INCOMPLETE_COLLECTED_AMOUNT',
//     );
//   }

//   return {
//     latitud,
//     longitud,

//     precision_gps:
//       normalizeOptionalNumber(
//         payload.precision_gps,
//         'precisión GPS',
//         {
//           min: 0,
//         },
//       ),

//     cantidad_recolectada:
//       cantidad,

//     unidad_medida:
//       unidad,

//     fecha_dispositivo:
//       validateDeviceDate(
//         payload
//           .fecha_dispositivo,
//       ),

//     clave_idempotencia:
//       validateIdempotencyKey(
//         payload
//           .clave_idempotencia,
//       ),

//     observacion:
//       payload.observacion
//         ?.trim() ||
//       null,
//   };
// };

// module.exports = {
//   UNIDADES_PERMITIDAS,
//   validateId,
//   validateDeviceDate,
//   validateIdempotencyKey,
//   normalizeOptionalNumber,
//   normalizeCollectionPayload,
// };