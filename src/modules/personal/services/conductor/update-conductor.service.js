const { Op } = require('sequelize');
const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error');

// Services
const getConductorByIdService = require('./get-conductor-by-id.service');

// Modelos
const { ConductorPerfil } = db;

// Validations
const { validateLicenseDates } = require('../../validations/conductor.validation');

// Utils
const { ESTADOS_LICENCIA } = require("../../utils/conductor/conductor_constantes.utils");
const {
  validateId,
  normalizeLicense,
} = require("../../utils/conductor/conductor.utils");

// ===============================================
// SERVICE: Actualizar perfil de conductor
// ===============================================
const updateConductorService = async (
  idPersonal,
  payload,
) => {
  const id =
    validateId(idPersonal);

  const conductor =
    await ConductorPerfil
      .findOne({
        where: {
          id_personal: id,
        },
      });

  if (!conductor) {
    throw new AppError(
      'El perfil de conductor no fue encontrado.',
      404,
      'DRIVER_PROFILE_NOT_FOUND',
    );
  }

  const data = {};

  if (
    payload.numero_licencia !==
    undefined
  ) {
    const numero =
      normalizeLicense(
        payload.numero_licencia,
      );

    if (!numero) {
      throw new AppError(
        'El número de licencia no puede estar vacío.',
        400,
        'LICENSE_NUMBER_REQUIRED',
      );
    }

    const duplicado =
      await ConductorPerfil
        .findOne({
          where: {
            numero_licencia:
              numero,

            id_conductor: {
              [Op.ne]:
                conductor.id_conductor,
            },
          },

          paranoid: false,
        });

    if (duplicado) {
      throw new AppError(
        'El número de licencia ya se encuentra registrado.',
        409,
        'LICENSE_ALREADY_EXISTS',
      );
    }

    data.numero_licencia =
      numero;
  }

  if (
    payload.categoria_licencia !==
    undefined
  ) {
    const categoria =
      normalizeLicense(
        payload.categoria_licencia,
      );

    if (!categoria) {
      throw new AppError(
        'La categoría de licencia no puede estar vacía.',
        400,
        'LICENSE_CATEGORY_REQUIRED',
      );
    }

    data.categoria_licencia =
      categoria;
  }

  if (
    payload.fecha_emision_licencia !==
    undefined
  ) {
    data.fecha_emision_licencia =
      payload.fecha_emision_licencia ||
      null;
  }

  if (
    payload.fecha_vencimiento_licencia !==
    undefined
  ) {
    data.fecha_vencimiento_licencia =
      payload
        .fecha_vencimiento_licencia;
  }

  if (
    payload.estado_licencia !==
    undefined
  ) {
    if (
      !ESTADOS_LICENCIA.includes(
        payload.estado_licencia,
      )
    ) {
      throw new AppError(
        'El estado de la licencia no es válido.',
        400,
        'INVALID_LICENSE_STATUS',
      );
    }

    data.estado_licencia =
      payload.estado_licencia;
  }

  if (
    payload.restricciones !==
    undefined
  ) {
    data.restricciones =
      payload.restricciones
        ?.trim() || null;
  }

  if (
    payload.observacion !==
    undefined
  ) {
    data.observacion =
      payload.observacion
        ?.trim() || null;
  }

  if (!Object.keys(data).length) {
    throw new AppError(
      'No se proporcionaron campos para actualizar.',
      400,
      'NO_UPDATE_FIELDS',
    );
  }

  validateLicenseDates({
    fecha_emision_licencia:
      data
        .fecha_emision_licencia !==
        undefined
        ? data
          .fecha_emision_licencia
        : conductor
          .fecha_emision_licencia,

    fecha_vencimiento_licencia:
      data
        .fecha_vencimiento_licencia ||
      conductor
        .fecha_vencimiento_licencia,

    estado_licencia:
      data.estado_licencia ||
      conductor.estado_licencia,
  });

  await conductor.update(data);

  return getConductorByIdService(id);
};


module.exports = updateConductorService;