// services/set-primary-address.service.js

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
// SERVICE: Establecer domicilio principal
// ===============================================
const setPrimaryAddressService = async ({ id_usuario, id_domicilio, }) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
    );

  const addressId = validateId(
    id_domicilio,
    'identificador del domicilio',
  );

  const transaction = await sequelize.transaction();

  try {
    const ciudadano = await getCitizenByUserOrFail(
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

    await CiudadanoDomicilio
      .update(
        {
          es_principal:
            false,
        },
        {
          where: {
            id_ciudadano:
              ciudadano
                .id_ciudadano,
          },

          transaction,
        },
      );

    await domicilio.update(
      {
        es_principal:
          true,

        estado_domicilio:
          'ACTIVO',
      },
      {
        transaction,
      },
    );

    await transaction.commit();

    return domicilio;
  } catch (error) {
    if (
      !transaction.finished
    ) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = setPrimaryAddressService;