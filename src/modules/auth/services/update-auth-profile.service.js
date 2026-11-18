const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

const getAuthProfileService = require('./get-auth-profile.service');

const CAMPOS_PERMITIDOS = [
  'nombres',
  'apellidos',
  'celular',
  'direccion',
];

const validarDatos = (payload) => {
  if (
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    throw new AppError('Los datos enviados no son válidos.', 400);
  }

  const campos = Object.keys(payload);

  if (
    campos.length === 0 ||
    campos.some((campo) => !CAMPOS_PERMITIDOS.includes(campo))
  ) {
    throw new AppError(
      'Solo puedes actualizar nombres, apellidos, celular y dirección.',
      400,
    );
  }

  const data = {};

  for (const campo of ['nombres', 'apellidos']) {
    if (!Object.prototype.hasOwnProperty.call(payload, campo)) {
      continue;
    }

    const value = payload[campo];

    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > 100
    ) {
      throw new AppError(
        `El campo ${campo} es obligatorio y admite hasta 100 caracteres.`,
        400,
      );
    }

    data[campo] = value.trim();
  }

  for (const campo of ['celular', 'direccion']) {
    if (!Object.prototype.hasOwnProperty.call(payload, campo)) {
      continue;
    }

    const value = payload[campo];

    if (value !== null && typeof value !== 'string') {
      throw new AppError(`El campo ${campo} no es válido.`, 400);
    }

    const texto = value?.trim() || null;
    const limite = campo === 'celular' ? 20 : 255;

    if (texto && texto.length > limite) {
      throw new AppError(
        `El campo ${campo} admite hasta ${limite} caracteres.`,
        400,
      );
    }

    data[campo] = texto;
  }

  if (
    data.celular &&
    !/^\+?[0-9 ()-]{7,20}$/.test(data.celular)
  ) {
    throw new AppError('El número de celular no es válido.', 400);
  }

  return data;
};

const updateAuthProfileService = async ({
  id_usuario,
  payload,
}) => {
  if (!/^[1-9]\d*$/.test(String(id_usuario ?? ''))) {
    throw new AppError('La sesión no es válida.', 401);
  }

  const data = validarDatos(payload);

  return db.sequelize.transaction(async (transaction) => {
    const usuario = await db.Usuario.findByPk(id_usuario, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!usuario || !usuario.estado) {
      throw new AppError(
        'La cuenta no está disponible.',
        403,
      );
    }

    const persona = await db.Persona.findByPk(
      usuario.id_persona,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      },
    );

    if (!persona || !persona.estado) {
      throw new AppError(
        'Los datos personales no están disponibles.',
        403,
      );
    }

    await persona.update(data, {
      fields: Object.keys(data),
      transaction,
    });

    return getAuthProfileService({
      id_usuario: usuario.id_usuario,
      transaction,
    });
  });
};

module.exports = updateAuthProfileService;