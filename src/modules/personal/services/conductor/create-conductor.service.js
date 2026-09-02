const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error');

// Modelos
const { ConductorPerfil } = db;

// Validations
const { validateLicenseDates } = require('../../validations/conductor.validation');

// Utils
const { getPersonalWithRoles } = require('../../utils/conductor/conductor_includes.utils');
const { ESTADOS_LICENCIA } = require("../../utils/conductor/conductor_constantes.utils");
const {
  validateId,
  normalizeLicense,
} = require("../../utils/conductor/conductor.utils");


// ===============================================
// SERVICE: Crear perfil de conductor
// ===============================================
const createConductorService =
  async (
    idPersonal,
    {
      numero_licencia,
      categoria_licencia,
      fecha_emision_licencia =
      null,
      fecha_vencimiento_licencia,
      estado_licencia =
      'VIGENTE',
      restricciones = null,
      observacion = null,
    },
  ) => {
    const id =
      validateId(idPersonal);

    const numero =
      normalizeLicense(
        numero_licencia,
      );

    const categoria =
      normalizeLicense(
        categoria_licencia,
      );

    if (
      !numero ||
      !categoria ||
      !fecha_vencimiento_licencia
    ) {
      throw new AppError(
        'El número, categoría y vencimiento de la licencia son obligatorios.',
        400,
        'DRIVER_REQUIRED_FIELDS',
      );
    }

    if (
      !ESTADOS_LICENCIA.includes(
        estado_licencia,
      )
    ) {
      throw new AppError(
        'El estado de la licencia no es válido.',
        400,
        'INVALID_LICENSE_STATUS',
      );
    }

    validateLicenseDates({
      fecha_emision_licencia,
      fecha_vencimiento_licencia,
      estado_licencia,
    });

    const personal =
      await getPersonalWithRoles(
        id,
      );

    if (
      !personal.estado ||
      personal.estado_laboral !==
      'ACTIVO'
    ) {
      throw new AppError(
        'El personal no se encuentra laboralmente activo.',
        403,
        'PERSONAL_INACTIVE',
      );
    }

    if (
      !personal.usuario.estado ||
      !personal.usuario.persona
        ?.estado
    ) {
      throw new AppError(
        'El usuario o la persona se encuentra inactiva.',
        403,
        'USER_OR_PERSON_INACTIVE',
      );
    }

    const tieneRolConductor =
      personal.usuario.roles?.some(
        (rol) =>
          rol.nombre ===
          'CONDUCTOR',
      );

    if (!tieneRolConductor) {
      throw new AppError(
        'El usuario debe tener el rol CONDUCTOR.',
        400,
        'USER_IS_NOT_DRIVER',
      );
    }

    const perfilExistente =
      await ConductorPerfil
        .findOne({
          where: {
            id_personal: id,
          },

          paranoid: false,
        });

    if (perfilExistente) {
      throw new AppError(
        'El personal ya tiene un perfil de conductor.',
        409,
        'DRIVER_PROFILE_ALREADY_EXISTS',
      );
    }

    const licenciaExistente =
      await ConductorPerfil
        .findOne({
          where: {
            numero_licencia:
              numero,
          },

          paranoid: false,
        });

    if (licenciaExistente) {
      throw new AppError(
        'El número de licencia ya se encuentra registrado.',
        409,
        'LICENSE_ALREADY_EXISTS',
      );
    }

    return ConductorPerfil.create({
      id_personal: id,
      numero_licencia:
        numero,
      categoria_licencia:
        categoria,
      fecha_emision_licencia,
      fecha_vencimiento_licencia,
      estado_licencia,
      restricciones:
        restricciones?.trim() ||
        null,
      observacion:
        observacion?.trim() ||
        null,
      estado: true,
    });
  };


module.exports = createConductorService;