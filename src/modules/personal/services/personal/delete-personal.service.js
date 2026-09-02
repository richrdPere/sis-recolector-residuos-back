const db = require('../../../../database/models',);
const AppError = require('../../../../utils/app-error',);

// Modelos
const {
  PersonalOperativo,
  ConductorPerfil,
  sequelize,
} = db;


// Utils
const { validateId } = require('../../utils/personal/personal.util');


// ==========================================
// SERVICE: Eliminar personal
// ==========================================
const deletePersonalService = async (idPersonal) => {
  const id = validateId(
    idPersonal,
    'identificador del personal',
  );

  const transaction =
    await sequelize.transaction();

  try {
    const personal =
      await PersonalOperativo
        .findByPk(
          id,
          {
            transaction,
          },
        );

    if (!personal) {
      throw new AppError(
        'El personal operativo no fue encontrado.',
        404,
        'PERSONAL_NOT_FOUND',
      );
    }

    await ConductorPerfil.update(
      {
        estado: false,
      },
      {
        where: {
          id_personal: id,
          estado: true,
        },

        transaction,
      },
    );

    await personal.destroy({
      transaction,
    });

    await transaction.commit();

    return {
      id_personal: id,
      deleted: true,
    };
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    throw error;
  }
};

module.exports = deletePersonalService;