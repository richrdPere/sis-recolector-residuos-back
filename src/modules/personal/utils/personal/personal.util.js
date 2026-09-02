const validateId = (value, name = 'identificador') => {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new AppError(
      `El ${name} no es válido.`,
      400,
      'INVALID_ID',
    );
  }

  return id;
};

const parseBoolean = (value, fieldName) => {
  if (
    value === true ||
    value === 'true' ||
    value === '1'
  ) {
    return true;
  }

  if (
    value === false ||
    value === 'false' ||
    value === '0'
  ) {
    return false;
  }

  throw new AppError(
    `El campo ${fieldName} debe ser verdadero o falso.`,
    400,
    'INVALID_BOOLEAN_VALUE',
  );
};



module.exports = {
  validateId,
  parseBoolean,
};