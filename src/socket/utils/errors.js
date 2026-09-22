const fail = (message, code, statusCode = 403) => {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
};
const responseError = (error) => {
  const status = Number(error.data?.statusCode || error.statusCode || error.status);
  const known = status >= 400 && status < 500;
  return {
    success: false,
    message: known ? error.message : 'No se pudo procesar el evento.',
    code: known ? (error.data?.code || error.code || error.errorCode || 'REQUEST_REJECTED') : 'SOCKET_INTERNAL_ERROR',
    statusCode: known ? status : 500,
    data: null,
  };
};
const id = (value) => {
  if (!['number', 'string'].includes(typeof value) || !/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
    throw fail('Identificador inválido.', 'INVALID_ID', 400);
  }
  return Number(value);
};
module.exports = { fail, responseError, id };
