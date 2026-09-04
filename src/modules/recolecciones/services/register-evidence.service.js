// services/register-evidence.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  RecoleccionPunto,
  RecoleccionEvidencia,
} = db;

// ===============================================
// Services: Register evidencias opcional
// ===============================================
const registerEvidenceService = async (
  idRecoleccion,
  fileData,
  {
    id_usuario,
  },
) => {
  const collectionId =
    validateId(
      idRecoleccion,
      'identificador de la recolección',
    );

  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const collection =
    await RecoleccionPunto
      .findByPk(
        collectionId,
      );

  if (!collection) {
    throw new AppError(
      'La recolección no fue encontrada.',
      404,
      'COLLECTION_NOT_FOUND',
    );
  }

  if (
    collection
      .estado_recoleccion ===
    'ANULADA'
  ) {
    throw new AppError(
      'No se puede adjuntar evidencia a una recolección anulada.',
      409,
      'COLLECTION_ANNULLED',
    );
  }

  if (!fileData) {
    throw new AppError(
      'Debe adjuntar un archivo.',
      400,
      'EVIDENCE_FILE_REQUIRED',
    );
  }

  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (
    !allowedMimeTypes.includes(
      fileData.mimetype,
    )
  ) {
    throw new AppError(
      'El tipo de archivo no está permitido.',
      400,
      'INVALID_EVIDENCE_FILE_TYPE',
    );
  }

  const evidenceType =
    fileData.mimetype
      .startsWith(
        'image/',
      )
      ? 'IMAGEN'
      : 'DOCUMENTO';

  return RecoleccionEvidencia
    .create({
      id_recoleccion:
        collectionId,

      id_usuario:
        userId,

      tipo_evidencia:
        evidenceType,

      nombre_original:
        fileData
          .originalname,

      nombre_almacenado:
        fileData
          .filename,

      ruta_archivo:
        fileData.path,

      mime_type:
        fileData.mimetype,

      extension:
        fileData
          .originalname
          ?.split('.')
          .pop()
          ?.toLowerCase() ||
        null,

      tamano_bytes:
        fileData.size,

      descripcion:
        fileData
          .descripcion
          ?.trim() ||
        null,

      fecha_captura:
        fileData
          .fecha_captura ||
        null,

      estado_evidencia:
        'ACTIVA',
    });
};

module.exports = registerEvidenceService;