// services/annul-collection.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const {
  validateId,
} = require(
  '../validations/recoleccion.validation',
);

// Modelos
const {
  RecoleccionPunto,
  sequelize,
} = db;

// ===============================================
// Services: Anular recoleccion
// ===============================================
const annulCollectionService = async (idRecoleccion, {
  motivo_anulacion,
},
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

  const transaction =
    await sequelize.transaction();

  try {
    const collection =
      await RecoleccionPunto
        .findByPk(
          collectionId,
          {
            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          },
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
        'La recolección ya se encuentra anulada.',
        409,
        'COLLECTION_ALREADY_ANNULLED',
      );
    }

    await collection.update(
      {
        estado_recoleccion:
          'ANULADA',

        motivo_anulacion:
          reason,

        fecha_anulacion:
          new Date(),

        id_usuario_anulacion:
          userId,
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return collection;
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction
        .rollback();
    }

    throw error;
  }
};

module.exports = annulCollectionService;