// validations/ciudadano.validation.js

const AppError = require('../../../utils/app-error');

const validateId = (value, field = 'identificador',) => {
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
}) => {
  const latitude =
    Number(latitud);

  const longitude =
    Number(longitud);

  if (
    !Number.isFinite(
      latitude,
    ) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new AppError(
      'La latitud no es válida.',
      400,
      'INVALID_LATITUDE',
    );
  }

  if (
    !Number.isFinite(
      longitude,
    ) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new AppError(
      'La longitud no es válida.',
      400,
      'INVALID_LONGITUDE',
    );
  }

  return {
    latitud:
      latitude,

    longitud:
      longitude,
  };
};

const validateRequiredText = (
  value,
  field,
  maxLength = null,
) => {
  if (
    typeof value !==
    'string' ||
    !value.trim()
  ) {
    throw new AppError(
      `El campo ${field} es obligatorio.`,
      400,
      'REQUIRED_FIELD',
    );
  }

  const normalizedValue =
    value.trim();

  if (
    maxLength &&
    normalizedValue.length >
    maxLength
  ) {
    throw new AppError(
      `El campo ${field} no puede superar los ${maxLength} caracteres.`,
      400,
      'FIELD_TOO_LONG',
    );
  }

  return normalizedValue;
};

const validateBoolean = (
  value,
  field,
) => {
  if (
    typeof value !==
    'boolean'
  ) {
    throw new AppError(
      `El campo ${field} debe ser booleano.`,
      400,
      'INVALID_BOOLEAN',
    );
  }

  return value;
};

module.exports = {
  validateId,
  validateCoordinates,
  validateRequiredText,
  validateBoolean,
};