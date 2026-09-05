// services/create-citizen-profile.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validation
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
const {
  Ciudadano,
  CiudadanoPreferenciaNotificacion,
  sequelize,
} = db;

// ===============================================
// SERVICE: Crear ciudadano
// ===============================================
const createCitizenProfileService = async ({
  id_usuario,
  acepta_tratamiento_datos,
  version_consentimiento,
  origen_registro = 'WEB',
  observacion = null,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  if (
    acepta_tratamiento_datos !==
    true
  ) {
    throw new AppError(
      'Debe aceptar el tratamiento de datos personales.',
      400,
      'DATA_CONSENT_REQUIRED',
    );
  }

  const consentVersion =
    String(
      version_consentimiento ||
      '',
    ).trim();

  if (!consentVersion) {
    throw new AppError(
      'La versión del consentimiento es obligatoria.',
      400,
      'CONSENT_VERSION_REQUIRED',
    );
  }

  const allowedOrigins = [
    'WEB',
    'APP',
    'QR',
    'ADMINISTRATIVO',
  ];

  const normalizedOrigin =
    String(
      origen_registro,
    )
      .trim()
      .toUpperCase();

  if (
    !allowedOrigins.includes(
      normalizedOrigin,
    )
  ) {
    throw new AppError(
      'El origen de registro no es válido.',
      400,
      'INVALID_REGISTRATION_ORIGIN',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    await getUserOrFail(
      userId,
      transaction,
    );

    const existing =
      await Ciudadano.findOne({
        where: {
          id_usuario:
            userId,
        },

        paranoid: false,
        transaction,
      });

    if (existing) {
      throw new AppError(
        'El usuario ya tiene un perfil ciudadano.',
        409,
        'CITIZEN_PROFILE_ALREADY_EXISTS',
      );
    }

    const now =
      new Date();

    const ciudadano =
      await Ciudadano.create(
        {
          id_usuario:
            userId,

          acepta_tratamiento_datos:
            true,

          fecha_consentimiento:
            now,

          version_consentimiento:
            consentVersion,

          origen_registro:
            normalizedOrigin,

          estado_ciudadano:
            'ACTIVO',

          fecha_activacion:
            now,

          observacion:
            observacion
              ?.trim() ||
            null,
        },
        {
          transaction,
        },
      );

    await CiudadanoPreferenciaNotificacion
      .create(
        {
          id_ciudadano:
            ciudadano
              .id_ciudadano,

          notificaciones_habilitadas:
            true,

          canal_push:
            true,

          canal_interno:
            true,

          estado_preferencia:
            'ACTIVA',
        },
        {
          transaction,
        },
      );

    await transaction.commit();

    return ciudadano;
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = createCitizenProfileService;