const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Service
const getPersonalByIdService = require('./get-personal-by-id.service');

// Modelos
const { PersonalOperativo } = db;

// Utils
const { validateId } = require('../../utils/personal/personal.util');

// ==========================================
// SERVICE: Activar o desactivar personal
// ==========================================

const changePersonalEstadoService = async ({
  id_personal,
  estado,
}) => {
  const id = validateId(
    id_personal,
    'identificador del personal',
  );

  if (
    typeof estado !==
    'boolean'
  ) {
    throw new AppError(
      'El campo estado debe ser verdadero o falso.',
      400,
      'INVALID_PERSONAL_STATUS',
    );
  }

  const personal =
    await PersonalOperativo
      .findByPk(id);

  if (!personal) {
    throw new AppError(
      'El personal operativo no fue encontrado.',
      404,
      'PERSONAL_NOT_FOUND',
    );
  }

  if (
    personal.estado ===
    estado
  ) {
    throw new AppError(
      estado
        ? 'El personal ya se encuentra activo.'
        : 'El personal ya se encuentra inactivo.',
      409,
      'PERSONAL_STATUS_NOT_CHANGED',
    );
  }

  await personal.update({
    estado,
  });

  return getPersonalByIdService(id);
};


module.exports = changePersonalEstadoService;