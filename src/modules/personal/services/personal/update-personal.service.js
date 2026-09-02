const { Op } = require('sequelize');
const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Service
const getPersonalByIdService = require('./get-personal-by-id.service');


// Modelos
const { PersonalOperativo } = db;


// Utils
const { validateId } = require('../../utils/personal/personal.util');

const {
  TIPOS_CONTRATO,
  TURNOS,
  ESTADOS_LABORALES,
} = require("../../utils/personal/personal_constantes.utils");


// ==========================================
// SERVICE: Actualizar personal
// ==========================================
const updatePersonalService = async (
  idPersonal,
  payload,
) => {
  const id = validateId(
    idPersonal,
    'identificador del personal',
  );

  const personal =
    await PersonalOperativo.findByPk(
      id,
    );

  if (!personal) {
    throw new AppError(
      'El personal operativo no fue encontrado.',
      404,
      'PERSONAL_NOT_FOUND',
    );
  }

  const data = {};

  if (
    payload.codigo_empleado !==
    undefined
  ) {
    const codigo = String(
      payload.codigo_empleado || '',
    )
      .trim()
      .toUpperCase();

    if (!codigo) {
      throw new AppError(
        'El código de empleado no puede estar vacío.',
        400,
        'EMPLOYEE_CODE_REQUIRED',
      );
    }

    const duplicado =
      await PersonalOperativo
        .findOne({
          where: {
            codigo_empleado:
              codigo,

            id_personal: {
              [Op.ne]: id,
            },
          },

          paranoid: false,
        });

    if (duplicado) {
      throw new AppError(
        'El código de empleado ya se encuentra registrado.',
        409,
        'EMPLOYEE_CODE_ALREADY_EXISTS',
      );
    }

    data.codigo_empleado =
      codigo;
  }

  if (
    payload.fecha_ingreso !==
    undefined
  ) {
    data.fecha_ingreso =
      payload.fecha_ingreso;
  }

  if (
    payload.fecha_salida !==
    undefined
  ) {
    data.fecha_salida =
      payload.fecha_salida ||
      null;
  }

  if (
    payload.tipo_contrato !==
    undefined
  ) {
    if (
      !TIPOS_CONTRATO.includes(
        payload.tipo_contrato,
      )
    ) {
      throw new AppError(
        'El tipo de contrato no es válido.',
        400,
        'INVALID_CONTRACT_TYPE',
      );
    }

    data.tipo_contrato =
      payload.tipo_contrato;
  }

  if (
    payload.turno_preferente !==
    undefined
  ) {
    if (
      payload.turno_preferente &&
      !TURNOS.includes(
        payload.turno_preferente,
      )
    ) {
      throw new AppError(
        'El turno preferente no es válido.',
        400,
        'INVALID_PREFERRED_SHIFT',
      );
    }

    data.turno_preferente =
      payload.turno_preferente ||
      null;
  }

  if (
    payload.estado_laboral !==
    undefined
  ) {
    if (
      !ESTADOS_LABORALES.includes(
        payload.estado_laboral,
      )
    ) {
      throw new AppError(
        'El estado laboral no es válido.',
        400,
        'INVALID_EMPLOYMENT_STATUS',
      );
    }

    data.estado_laboral =
      payload.estado_laboral;
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

  const estadoFinal =
    data.estado_laboral ||
    personal.estado_laboral;

  const fechaSalidaFinal =
    data.fecha_salida !==
      undefined
      ? data.fecha_salida
      : personal.fecha_salida;

  if (
    estadoFinal === 'CESADO' &&
    !fechaSalidaFinal
  ) {
    throw new AppError(
      'Debe registrar la fecha de salida cuando el trabajador está cesado.',
      400,
      'TERMINATION_DATE_REQUIRED',
    );
  }

  await personal.update(data);

  return getPersonalByIdService(id);
};


module.exports = updatePersonalService;