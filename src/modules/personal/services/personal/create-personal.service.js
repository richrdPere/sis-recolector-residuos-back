const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Service
const getPersonalByIdService = require('./get-personal-by-id.service');

// Modelos
const {
  PersonalOperativo,
  Usuario,
  Persona,
  Roles,
} = db;

// Utils
const { validateId } = require('../../utils/personal/personal.util');

const {
  TIPOS_CONTRATO,
  TURNOS,
  ESTADOS_LABORALES,
  ROLES_PERSONAL
} = require("../../utils/personal/personal_constantes.utils");


// ==========================================
// SERVICE: Crear personal
// ==========================================
const createPersonalService = async ({
  id_usuario,
  codigo_empleado,
  fecha_ingreso,
  fecha_salida = null,
  tipo_contrato = 'CONTRATADO',
  turno_preferente = null,
  estado_laboral = 'ACTIVO',
  observacion = null,
}) => {
  const idUsuario =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const codigo = String(
    codigo_empleado || '',
  )
    .trim()
    .toUpperCase();

  if (!codigo || !fecha_ingreso) {
    throw new AppError(
      'El usuario, código de empleado y fecha de ingreso son obligatorios.',
      400,
      'PERSONAL_REQUIRED_FIELDS',
    );
  }

  if (
    !TIPOS_CONTRATO.includes(
      tipo_contrato,
    )
  ) {
    throw new AppError(
      'El tipo de contrato no es válido.',
      400,
      'INVALID_CONTRACT_TYPE',
    );
  }

  if (
    turno_preferente &&
    !TURNOS.includes(
      turno_preferente,
    )
  ) {
    throw new AppError(
      'El turno preferente no es válido.',
      400,
      'INVALID_PREFERRED_SHIFT',
    );
  }

  if (
    !ESTADOS_LABORALES.includes(
      estado_laboral,
    )
  ) {
    throw new AppError(
      'El estado laboral no es válido.',
      400,
      'INVALID_EMPLOYMENT_STATUS',
    );
  }

  const usuario = await Usuario.findByPk(
    idUsuario,
    {
      attributes: [
        'id_usuario',
        'id_persona',
        'username',
        'email_acceso',
        'estado',
      ],

      include: [
        {
          model: Persona,
          as: 'persona',

          attributes: [
            'id_persona',
            'nombres',
            'apellidos',
            'estado',
          ],

          required: true,
        },
        {
          model: Roles,
          as: 'roles',

          attributes: [
            'id_rol',
            'nombre',
          ],

          where: {
            estado: true,
          },

          through: {
            where: {
              estado: true,
            },

            attributes: [],
          },

          required: false,
        },
      ],
    },
  );

  if (!usuario) {
    throw new AppError(
      'El usuario no fue encontrado.',
      404,
      'USER_NOT_FOUND',
    );
  }

  if (!usuario.estado) {
    throw new AppError(
      'El usuario se encuentra inactivo.',
      403,
      'USER_INACTIVE',
    );
  }

  if (!usuario.persona?.estado) {
    throw new AppError(
      'La persona asociada se encuentra inactiva.',
      403,
      'PERSON_INACTIVE',
    );
  }

  const rolesUsuario =
    usuario.roles?.map(
      (rol) => rol.nombre,
    ) || [];

  const tieneRolOperativo =
    rolesUsuario.some((rol) =>
      ROLES_PERSONAL.includes(rol),
    );

  if (!tieneRolOperativo) {
    throw new AppError(
      'El usuario debe tener al menos un rol operativo.',
      400,
      'USER_WITHOUT_OPERATIONAL_ROLE',
    );
  }

  const perfilExistente = await PersonalOperativo.findOne({
    where: {
      id_usuario: idUsuario,
    },
    paranoid: false,
  });

  if (perfilExistente) {
    throw new AppError(
      'El usuario ya tiene un perfil laboral registrado.',
      409,
      'PERSONAL_PROFILE_ALREADY_EXISTS',
    );
  }

  const codigoExistente =
    await PersonalOperativo.findOne({
      where: {
        codigo_empleado: codigo,
      },
      paranoid: false,
    });

  if (codigoExistente) {
    throw new AppError(
      'El código de empleado ya se encuentra registrado.',
      409,
      'EMPLOYEE_CODE_ALREADY_EXISTS',
    );
  }

  const personal = await PersonalOperativo.create({
    id_usuario: idUsuario,
    codigo_empleado: codigo,
    fecha_ingreso,
    fecha_salida,
    tipo_contrato,
    turno_preferente,
    estado_laboral,
    observacion:
      observacion?.trim() ||
      null,
    estado: true,
  });

  return getPersonalByIdService(
    personal.id_personal,
  );
};


module.exports = createPersonalService;