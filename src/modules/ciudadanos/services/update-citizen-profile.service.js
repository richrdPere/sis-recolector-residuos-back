// services/update-citizen-profile.service.js

const db = require('../../../database/models');

// Validation
const { validateId } = require('../validations/ciudadano.validation');

// Utils
const { getCitizenByUserOrFail } = require('../utils/ciudadano-service.utils');

// Modelos
const {
  sequelize,
} = db;

// ===============================================
// SERVICE: Actualizar perfil del ciudadano
// ===============================================
const updateCitizenProfileService = async ({
  id_usuario,
  acepta_tratamiento_datos,
  version_consentimiento,
  observacion,
}) => {
  const userId =
    validateId(
      id_usuario,
      'identificador del usuario',
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

    const updateData = {};

    if (
      observacion !==
      undefined
    ) {
      updateData.observacion =
        observacion
          ?.trim() ||
        null;
    }

    if (
      acepta_tratamiento_datos !==
      undefined
    ) {
      updateData
        .acepta_tratamiento_datos =
        Boolean(
          acepta_tratamiento_datos,
        );

      updateData
        .fecha_consentimiento =
        acepta_tratamiento_datos
          ? new Date()
          : null;

      if (
        acepta_tratamiento_datos
      ) {
        const consentVersion =
          String(
            version_consentimiento ||
            ciudadano
              .version_consentimiento ||
            '',
          ).trim();

        updateData
          .version_consentimiento =
          consentVersion;
      } else {
        updateData
          .estado_ciudadano =
          'INACTIVO';

        updateData
          .fecha_desactivacion =
          new Date();

        updateData
          .motivo_desactivacion =
          'Revocación del consentimiento para el tratamiento de datos.';
      }
    }

    await ciudadano.update(
      updateData,
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

module.exports = updateCitizenProfileService;