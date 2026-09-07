// services/create-qr-code.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
  validateResourceType,
  validateRequiredText,
} = require(
  '../validations/codigo-qr.validation',
);

// Utils
const {
  generatePublicToken,
  generateAdministrativeCode,
  buildPublicQrUrl,
  validateResourceExists,
} = require(
  '../utils/codigo-qr-service.utils',
);

// Modelos
const {
  CodigoQr,
  sequelize,
} = db;

// ===============================================
// SERVICE: Crear codigo QR
// ===============================================
const createQrCodeService = async ({
  tipo_recurso,
  id_zona = null,
  id_ruta = null,
  titulo,
  descripcion = null,
  fecha_expiracion = null,
  observacion = null,
  id_usuario_creacion,
}) => {
  const resourceType =
    validateResourceType(
      tipo_recurso,
    );

  const creatorId =
    validateId(
      id_usuario_creacion,
      'identificador del usuario creador',
    );

  const normalizedTitle =
    validateRequiredText(
      titulo,
      'título',
      150,
    );

  const zoneId =
    resourceType ===
      'ZONA'
      ? validateId(
        id_zona,
        'identificador de la zona',
      )
      : null;

  const routeId =
    resourceType ===
      'RUTA'
      ? validateId(
        id_ruta,
        'identificador de la ruta',
      )
      : null;

  if (
    fecha_expiracion &&
    new Date(
      fecha_expiracion,
    ).getTime() <=
    Date.now()
  ) {
    throw new AppError(
      'La fecha de expiración debe ser futura.',
      400,
      'INVALID_QR_EXPIRATION',
    );
  }

  const transaction =
    await sequelize.transaction();

  try {
    await validateResourceExists({
      tipoRecurso:
        resourceType,

      idZona:
        zoneId,

      idRuta:
        routeId,

      transaction,
    });

    const resourceWhere =
      resourceType ===
        'ZONA'
        ? {
          id_zona:
            zoneId,
        }
        : {
          id_ruta:
            routeId,
        };

    const existingQr =
      await CodigoQr.findOne({
        where: {
          tipo_recurso:
            resourceType,

          estado_qr:
            'ACTIVO',

          ...resourceWhere,
        },

        transaction,

        lock:
          transaction
            .LOCK.UPDATE,
      });

    if (existingQr) {
      throw new AppError(
        'El recurso ya tiene un código QR activo.',
        409,
        'ACTIVE_QR_ALREADY_EXISTS',
      );
    }

    const token =
      generatePublicToken();

    const codigoQr =
      await CodigoQr.create(
        {
          codigo:
            generateAdministrativeCode(
              resourceType,
            ),

          token_publico:
            token,

          tipo_recurso:
            resourceType,

          id_zona:
            zoneId,

          id_ruta:
            routeId,

          titulo:
            normalizedTitle,

          descripcion:
            descripcion
              ?.trim() ||
            null,

          version: 1,

          estado_qr:
            'ACTIVO',

          fecha_generacion:
            new Date(),

          fecha_expiracion:
            fecha_expiracion ||
            null,

          id_usuario_creacion:
            creatorId,

          observacion:
            observacion
              ?.trim() ||
            null,
        },
        {
          transaction,
        },
      );

    await transaction.commit();

    return {
      codigo_qr:
        codigoQr,

      url_publica:
        buildPublicQrUrl(
          token,
        ),
    };
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = createQrCodeService;