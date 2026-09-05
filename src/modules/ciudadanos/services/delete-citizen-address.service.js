// services/delete-citizen-address.service.js

const { Op } = require('sequelize');
const db = require('../../../database/models');

// Validations
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const {
  getCitizenByUserOrFail,
  getAddressOwnedOrFail,
} = require('../utils/ciudadano-service.utils');

// Modelos
const {
  CiudadanoDomicilio,
  sequelize,
} = db;

// ===============================================
// SERVICE: Eliminar domicilio
// ===============================================
const deleteCitizenAddressService = async ({
  id_usuario,
  id_domicilio,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const addressId =
    validateId(
      id_domicilio,
      'identificador del domicilio',
    );

  const transaction =
    await sequelize.transaction();

  try {
    const ciudadano =
      await getCitizenByUserOrFail(
        userId,
        {
          transaction,

          lock:
            transaction
              .LOCK.UPDATE,
        },
      );

    const domicilio =
      await getAddressOwnedOrFail({
        idDomicilio:
          addressId,

        idCiudadano:
          ciudadano
            .id_ciudadano,

        transaction,

        lock:
          transaction
            .LOCK.UPDATE,
      });

    if (
      domicilio.es_principal
    ) {
      const replacement =
        await CiudadanoDomicilio
          .findOne({
            where: {
              id_ciudadano:
                ciudadano
                  .id_ciudadano,

              id_domicilio: {
                [Op.ne]:
                  addressId,
              },

              estado_domicilio:
                'ACTIVO',
            },

            order: [
              [
                'created_at',
                'ASC',
              ],
            ],

            transaction,

            lock:
              transaction
                .LOCK.UPDATE,
          });

      if (replacement) {
        await replacement.update(
          {
            es_principal:
              true,
          },
          {
            transaction,
          },
        );
      }
    }

    await domicilio.destroy({
      transaction,
    });

    await transaction.commit();

    return {
      id_domicilio:
        addressId,

      eliminado:
        true,
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

module.exports = deleteCitizenAddressService;