// services/get-collection-evidences.service.js

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
// Services: Listar evitencias
// ===============================================
const getCollectionEvidencesService = async (idRecoleccion,) => {
  const collectionId =
    validateId(
      idRecoleccion,
      'identificador de la recolección',
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

  return RecoleccionEvidencia
    .findAll({
      where: {
        id_recoleccion:
          collectionId,

        estado_evidencia:
          'ACTIVA',
      },

      include: [
        {
          association:
            'usuario_registro',

          attributes: [
            'id_usuario',
            'username',
          ],
        },
      ],

      order: [
        [
          'created_at',
          'DESC',
        ],
      ],
    });
};

module.exports = getCollectionEvidencesService;