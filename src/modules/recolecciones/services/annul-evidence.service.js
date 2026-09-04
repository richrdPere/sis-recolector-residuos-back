// services/annul-evidence.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  RecoleccionEvidencia,
} = db;

// ===============================================
// Services: Anular evidencia
// ===============================================
const annulEvidenceService = async (
  idEvidencia,
  {
    motivo_anulacion,
  },
  {
    id_usuario,
  },
) => {
  const evidenceId =
    validateId(
      idEvidencia,
      'identificador de la evidencia',
    );

  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const reason =
    String(
      motivo_anulacion || '',
    ).trim();

  if (!reason) {
    throw new AppError(
      'Debe indicar el motivo de anulación.',
      400,
      'ANNULMENT_REASON_REQUIRED',
    );
  }

  const evidence =
    await RecoleccionEvidencia
      .findByPk(
        evidenceId,
      );

  if (!evidence) {
    throw new AppError(
      'La evidencia no fue encontrada.',
      404,
      'EVIDENCE_NOT_FOUND',
    );
  }

  if (
    evidence
      .estado_evidencia ===
    'ANULADA'
  ) {
    throw new AppError(
      'La evidencia ya se encuentra anulada.',
      409,
      'EVIDENCE_ALREADY_ANNULLED',
    );
  }

  await evidence.update({
    estado_evidencia:
      'ANULADA',

    motivo_anulacion:
      reason,

    fecha_anulacion:
      new Date(),

    id_usuario_anulacion:
      userId,
  });

  return evidence;
};

module.exports = annulEvidenceService;