// services/get-collection-by-id.service.js

const db = require('../../../database/models');
const AppError = require('../../../utils/app-error');

// Validations
const { validateId } = require('../validations/recoleccion.validation');

// Modelos
const {
  RecoleccionPunto,
} = db;

// ===============================================
// Services: Get recollecion por id
// ===============================================
const getCollectionByIdService = async (idRecoleccion,) => {
  const id =
    validateId(
      idRecoleccion,
      'identificador de la recolección',
    );

  const collection =
    await RecoleccionPunto
      .findByPk(
        id,
        {
          include: [
            {
              association:
                'recorrido',
            },
            {
              association:
                'punto_ruta',
            },
            {
              association:
                'usuario_registro',

              attributes: [
                'id_usuario',
                'username',
                'email_acceso',
              ],
            },
            {
              association:
                'usuario_anulacion',

              attributes: [
                'id_usuario',
                'username',
              ],

              required:
                false,
            },
            {
              association:
                'evidencias',

              where: {
                estado_evidencia:
                  'ACTIVA',
              },

              required:
                false,
            },
          ],
        },
      );

  if (!collection) {
    throw new AppError(
      'La recolección no fue encontrada.',
      404,
      'COLLECTION_NOT_FOUND',
    );
  }

  return collection;
};

module.exports = getCollectionByIdService;